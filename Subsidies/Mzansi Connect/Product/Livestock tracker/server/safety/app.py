"""Local development prototype. No real notification provider or rescue service."""
import argparse
import hashlib
import hmac
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


class ApiError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


def require(condition, status, message):
    if not condition:
        raise ApiError(status, message)


def text(value, name, maximum=200):
    require(isinstance(value, str) and 0 < len(value.strip()) <= maximum, 400, 'Invalid ' + name)
    return value.strip()


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def sample_payload(body):
    sample_id = text(body.get('sample_id'), 'sample_id', 36)
    try:
        require(str(uuid.UUID(sample_id)) == sample_id, 400, 'sample_id must be canonical UUID')
    except ValueError:
        raise ApiError(400, 'sample_id must be UUID')
    sequence = body.get('sequence')
    require(type(sequence) is int and 0 < sequence <= 9007199254740991, 400, 'Invalid sample sequence')
    captured = body.get('captured_at')
    if captured is not None:
        try:
            stamp = datetime.fromisoformat(captured.replace('Z', '+00:00'))
            require(stamp.tzinfo is not None, 400, 'captured_at needs timezone')
        except (ValueError, TypeError, AttributeError):
            raise ApiError(400, 'Invalid captured_at')
    clock = body.get('clock_quality', 'UNKNOWN')
    require(clock in ('GNSS', 'RTC', 'UNKNOWN'), 400, 'Invalid clock_quality')
    location = body.get('location')
    if location is not None:
        require(isinstance(location, dict), 400, 'Invalid location')
        for key, low, high in (('latitude', -90, 90), ('longitude', -180, 180)):
            value = location.get(key)
            require(type(value) in (int, float) and math.isfinite(value) and low <= value <= high, 400, 'Invalid ' + key)
        accuracy = location.get('accuracy_m')
        require(accuracy is None or (type(accuracy) in (int, float) and math.isfinite(accuracy) and 0 <= accuracy <= 100000), 400, 'Invalid accuracy')
        require(location.get('source') in ('GNSS', 'LAST_KNOWN'), 400, 'Invalid location source')
        location = {k: location.get(k) for k in ('latitude', 'longitude', 'accuracy_m', 'source')}
    battery = body.get('battery_v')
    require(battery is None or (type(battery) in (int, float) and math.isfinite(battery) and 0 <= battery <= 6), 400, 'Invalid battery')
    connectivity = body.get('connectivity')
    require(connectivity is None or (isinstance(connectivity, str) and len(connectivity) <= 40), 400, 'Invalid connectivity')
    return {'sample_id':sample_id, 'sequence':sequence, 'captured_at':captured, 'clock_quality':clock, 'location':location, 'battery_v':battery, 'connectivity':connectivity}


class Service:
    def __init__(self, db_path):
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,wearer_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,form_factor TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL,last_sequence INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY,wearer_id TEXT NOT NULL REFERENCES users(id),email TEXT NOT NULL,contact_user_id TEXT REFERENCES users(id),status TEXT NOT NULL,invitation_hash TEXT,expires REAL,UNIQUE(wearer_id,email));
            CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,event_id TEXT UNIQUE NOT NULL,device_id TEXT NOT NULL REFERENCES devices(id),wearer_id TEXT NOT NULL REFERENCES users(id),sequence INTEGER NOT NULL,payload_hash TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,received_at TEXT NOT NULL,closed_at TEXT,close_reason TEXT);
            CREATE TABLE IF NOT EXISTS shares(event_id TEXT NOT NULL REFERENCES events(id),contact_id TEXT NOT NULL REFERENCES contacts(id),active INTEGER NOT NULL DEFAULT 1,acknowledged_at TEXT,PRIMARY KEY(event_id,contact_id));
            CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,contact_id TEXT NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(event_id,contact_id));
            CREATE TABLE IF NOT EXISTS responses(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES events(id),actor_id TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL,created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS location_samples(sample_id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES events(id),sequence INTEGER NOT NULL,payload_hash TEXT NOT NULL,payload TEXT NOT NULL,received_at TEXT NOT NULL,UNIQUE(event_id,sequence));
            CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,wearer_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,subject_id TEXT NOT NULL,created_at TEXT NOT NULL);
            ''')

    def connect(self):
        db = sqlite3.connect(self.db_path, timeout=10, factory=ClosingConnection)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA synchronous=FULL')
        return db

    def audit(self, db, wearer, actor, action, subject):
        db.execute('INSERT INTO audit(wearer_id,actor_id,action,subject_id,created_at) VALUES(?,?,?,?,?)', (wearer, actor, action, subject, now()))

    def user(self, db, token):
        row = db.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?', (digest(token), time.time())).fetchone()
        require(row is not None, 401, 'Authentication required')
        return row

    def event_access(self, db, user, event_id, owner=False):
        event = db.execute('SELECT * FROM events WHERE id=?', (event_id,)).fetchone()
        require(event is not None, 404, 'Event unavailable')
        if event['wearer_id'] != user['id']:
            require(not owner and event['state'] != 'CLOSED' and db.execute('SELECT 1 FROM shares s JOIN contacts c ON c.id=s.contact_id WHERE s.event_id=? AND s.active=1 AND c.status=? AND c.contact_user_id=?', (event_id, 'ACCEPTED', user['id'])).fetchone(), 404, 'Event unavailable')
        return event

    def event_dict(self, db, event):
        data = json.loads(event['payload'])
        data.update({key: event[key] for key in ('id', 'event_id', 'device_id', 'wearer_id', 'state', 'received_at', 'closed_at', 'close_reason')})
        data['transport_status'] = 'BACKEND_RECEIVED'
        data['shares'] = [dict(r) for r in db.execute('SELECT s.contact_id,s.active,s.acknowledged_at,o.state AS notification_status FROM shares s LEFT JOIN outbox o ON o.event_id=s.event_id AND o.contact_id=s.contact_id WHERE s.event_id=?', (event['id'],))]
        data['responses'] = [dict(r) for r in db.execute('SELECT actor_id,message,created_at FROM responses WHERE event_id=? ORDER BY created_at', (event['id'],))]
        latest = db.execute('SELECT * FROM location_samples WHERE event_id=? ORDER BY sequence DESC LIMIT 1', (event['id'],)).fetchone()
        data['latest_sample'] = None if latest is None else dict(json.loads(latest['payload']), received_at=latest['received_at'])
        return data

    def call(self, method, path, body=None, token=''):
        body = {} if body is None else body
        require(isinstance(body, dict), 400, 'JSON object required')
        with self.connect() as db:
            # Serializes sequence checks, event writes and outbox changes transactionally.
            db.execute('BEGIN IMMEDIATE')
            if path == '/api/health' and method == 'GET':
                return 200, {'status': 'ok', 'mode': 'LOCAL_PROTOTYPE', 'notifications': 'SIMULATED_ONLY'}
            if path in ('/api/register', '/api/login') and method == 'POST':
                email = text(body.get('email'), 'email', 254).lower()
                require(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email), 400, 'Invalid email')
                password = body.get('password')
                require(isinstance(password, str) and 12 <= len(password) <= 256, 400, 'Password must be 12–256 characters')
                if path.endswith('register'):
                    require(db.execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone() is None, 409, 'Account unavailable')
                    salt = secrets.token_hex(16)
                    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 250000).hex()
                    uid = str(uuid.uuid4())
                    db.execute('INSERT INTO users VALUES(?,?,?,?,?)', (uid, email, text(body.get('name'), 'name', 80), salt, hashed))
                user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
                salt = user['salt'] if user else '00' * 16
                expected = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 250000).hex()
                require(user and hmac.compare_digest(expected, user['password']), 401, 'Invalid login')
                bearer = secrets.token_urlsafe(32)
                db.execute('INSERT INTO sessions VALUES(?,?,?)', (digest(bearer), user['id'], time.time() + 28800))
                self.audit(db, user['id'], user['id'], 'SESSION_CREATED', user['id'])
                return (201 if path.endswith('register') else 200), {'token': bearer, 'user': {k: user[k] for k in ('id', 'email', 'name')}, 'expires_in': 28800}
            device_parts = path.strip('/').split('/')
            if len(device_parts) == 5 and device_parts[:3] == ['api','device','events'] and device_parts[4] == 'locations' and method == 'POST':
                device = db.execute('SELECT * FROM devices WHERE token_hash=? AND active=1', (digest(token),)).fetchone()
                require(device, 401, 'Device authentication required')
                event = db.execute('SELECT * FROM events WHERE id=? AND device_id=?', (device_parts[3],device['id'])).fetchone()
                require(event, 404, 'Event unavailable')
                require(event['state'] != 'CLOSED', 409, 'Event is closed')
                payload = sample_payload(body)
                sample_id, sequence = payload['sample_id'], payload['sequence']
                canonical = json.dumps(payload, sort_keys=True, allow_nan=False)
                existing = db.execute('SELECT * FROM location_samples WHERE sample_id=?', (sample_id,)).fetchone()
                if existing:
                    require(existing['event_id'] == event['id'] and existing['payload_hash'] == digest(canonical), 409, 'Conflicting sample replay')
                    self.audit(db, event['wearer_id'], device['id'], 'SAMPLE_IDENTICAL_RETRY', sample_id)
                    return 200, {'event_id':event['id'],'sample_id':sample_id,'status':'BACKEND_RECEIVED','duplicate':True,'received_at':existing['received_at']}
                last = db.execute('SELECT COALESCE(MAX(sequence),0) AS sequence FROM location_samples WHERE event_id=?', (event['id'],)).fetchone()['sequence']
                require(sequence > last, 409, 'Stale sample sequence')
                receipt = now()
                db.execute('INSERT INTO location_samples VALUES(?,?,?,?,?,?)', (sample_id,event['id'],sequence,digest(canonical),canonical,receipt))
                self.audit(db,event['wearer_id'],device['id'],'LOCATION_SAMPLE_COMMITTED',sample_id)
                return 201, {'event_id':event['id'],'sample_id':sample_id,'status':'BACKEND_RECEIVED','duplicate':False,'received_at':receipt}
            if path == '/api/device/events' and method == 'POST':
                device = db.execute('SELECT * FROM devices WHERE token_hash=? AND active=1', (digest(token),)).fetchone()
                require(device, 401, 'Device authentication required')
                event_id = text(body.get('event_id'), 'event_id', 36)
                try:
                    require(str(uuid.UUID(event_id)) == event_id, 400, 'event_id must be canonical UUID')
                except ValueError:
                    raise ApiError(400, 'event_id must be UUID')
                sequence = body.get('sequence')
                require(type(sequence) is int and 0 < sequence <= 9007199254740991, 400, 'Invalid sequence')
                captured = body.get('captured_at')
                if captured is not None:
                    try:
                        stamp = datetime.fromisoformat(captured.replace('Z', '+00:00'))
                        require(stamp.tzinfo is not None, 400, 'captured_at needs timezone')
                    except (ValueError, TypeError, AttributeError):
                        raise ApiError(400, 'Invalid captured_at')
                clock = body.get('clock_quality', 'UNKNOWN')
                require(clock in ('GNSS', 'RTC', 'UNKNOWN'), 400, 'Invalid clock_quality')
                location = body.get('location')
                if location is not None:
                    require(isinstance(location, dict), 400, 'Invalid location')
                    for key, low, high in (('latitude', -90, 90), ('longitude', -180, 180)):
                        val = location.get(key)
                        require(type(val) in (int, float) and math.isfinite(val) and low <= val <= high, 400, 'Invalid ' + key)
                    accuracy = location.get('accuracy_m')
                    require(accuracy is None or (type(accuracy) in (int, float) and math.isfinite(accuracy) and 0 <= accuracy <= 100000), 400, 'Invalid accuracy')
                    require(location.get('source') in ('GNSS', 'LAST_KNOWN'), 400, 'Invalid location source')
                    location = {k: location.get(k) for k in ('latitude', 'longitude', 'accuracy_m', 'source')}
                battery = body.get('battery_v')
                require(battery is None or (type(battery) in (int, float) and math.isfinite(battery) and 0 <= battery <= 6), 400, 'Invalid battery')
                connectivity = body.get('connectivity')
                require(connectivity is None or (isinstance(connectivity, str) and len(connectivity) <= 40), 400, 'Invalid connectivity')
                payload = json.dumps({'event_id': event_id, 'sequence': sequence, 'captured_at': captured, 'clock_quality': clock, 'location': location, 'battery_v': battery, 'connectivity': connectivity}, sort_keys=True, allow_nan=False)
                existing = db.execute('SELECT * FROM events WHERE event_id=?', (event_id,)).fetchone()
                if existing:
                    require(existing['device_id'] == device['id'] and existing['payload_hash'] == digest(payload), 409, 'Conflicting event replay')
                    self.audit(db, device['wearer_id'], device['id'], 'IDENTICAL_RETRY', event_id)
                    return 200, {'event_id': event_id, 'status': 'BACKEND_RECEIVED', 'duplicate': True, 'received_at': existing['received_at']}
                require(sequence > device['last_sequence'], 409, 'Stale sequence')
                receipt = now()
                db.execute('INSERT INTO events(id,event_id,device_id,wearer_id,sequence,payload_hash,payload,state,received_at) VALUES(?,?,?,?,?,?,?,?,?)', (event_id, event_id, device['id'], device['wearer_id'], sequence, digest(payload), payload, 'ACTIVE', receipt))
                db.execute('UPDATE devices SET last_sequence=? WHERE id=?', (sequence, device['id']))
                self.audit(db, device['wearer_id'], device['id'], 'EVENT_COMMITTED', event_id)
                return 201, {'event_id': event_id, 'status': 'BACKEND_RECEIVED', 'duplicate': False, 'received_at': receipt}

            user = self.user(db, token)
            uid = user['id']
            if path == '/api/logout' and method == 'POST':
                db.execute('DELETE FROM sessions WHERE token_hash=?', (digest(token),))
                return 200, {'logged_out': True}
            if path == '/api/devices':
                if method == 'GET':
                    return 200, {'devices': [dict(r) for r in db.execute('SELECT id,name,form_factor,active,last_sequence FROM devices WHERE wearer_id=?', (uid,))]}
                if method == 'POST':
                    factor = body.get('form_factor')
                    require(factor in ('pendant', 'wristband', 'clip'), 400, 'Invalid form_factor')
                    did, device_token = str(uuid.uuid4()), secrets.token_urlsafe(32)
                    name = text(body.get('name'), 'name', 80)
                    db.execute('INSERT INTO devices(id,wearer_id,name,form_factor,token_hash) VALUES(?,?,?,?,?)', (did, uid, name, factor, digest(device_token)))
                    self.audit(db, uid, uid, 'SIMULATOR_DEVICE_PROVISIONED', did)
                    return 201, {'device': {'id': did, 'name': name, 'form_factor': factor}, 'device_token': device_token, 'warning': 'Local simulator provisioning; physical pairing not implemented'}
            if path.startswith('/api/devices/') and method == 'DELETE':
                did = path.split('/')[-1]
                require(db.execute('UPDATE devices SET active=0 WHERE id=? AND wearer_id=?', (did, uid)).rowcount, 404, 'Device unavailable')
                self.audit(db, uid, uid, 'DEVICE_REVOKED', did)
                return 200, {'revoked': True}
            if path == '/api/contacts' and method == 'GET':
                return 200, {'contacts': [dict(r) for r in db.execute('SELECT id,email,status,contact_user_id FROM contacts WHERE wearer_id=?', (uid,))]}
            if path == '/api/contacts/invitations' and method == 'POST':
                email = text(body.get('email'), 'email', 254).lower()
                require(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) and email != user['email'], 400, 'Invalid contact email')
                old = db.execute('SELECT * FROM contacts WHERE wearer_id=? AND email=?', (uid, email)).fetchone()
                require(not old or old['status'] == 'REVOKED', 409, 'Contact invitation already exists')
                cid, invitation = str(uuid.uuid4()), secrets.token_urlsafe(32)
                if old:
                    cid = old['id']
                    db.execute('UPDATE contacts SET status=?,contact_user_id=NULL,invitation_hash=?,expires=? WHERE id=?', ('INVITED', digest(invitation), time.time()+86400, cid))
                else:
                    db.execute('INSERT INTO contacts VALUES(?,?,?,?,?,?,?)', (cid, uid, email, None, 'INVITED', digest(invitation), time.time()+86400))
                self.audit(db, uid, uid, 'CONTACT_INVITED', cid)
                return 201, {'invitation_token': invitation, 'contact': {'id': cid, 'email': email, 'status': 'INVITED'}, 'warning': 'Manually exchange invitation securely; email delivery and account email verification are not implemented'}
            if path == '/api/contacts/invitations/accept' and method == 'POST':
                invitation = text(body.get('invitation_token'), 'invitation_token', 200)
                contact = db.execute('SELECT * FROM contacts WHERE invitation_hash=? AND status=? AND expires>?', (digest(invitation), 'INVITED', time.time())).fetchone()
                require(contact and contact['email'] == user['email'], 403, 'Invitation unavailable')
                db.execute('UPDATE contacts SET status=?,contact_user_id=?,invitation_hash=NULL WHERE id=?', ('ACCEPTED', uid, contact['id']))
                self.audit(db, contact['wearer_id'], uid, 'CONTACT_ACCEPTED', contact['id'])
                return 200, {'accepted': True, 'contact_id': contact['id']}
            if path.startswith('/api/contacts/') and method == 'DELETE':
                cid = path.split('/')[-1]
                require(db.execute('UPDATE contacts SET status=?,invitation_hash=NULL WHERE id=? AND wearer_id=?', ('REVOKED', cid, uid)).rowcount, 404, 'Contact unavailable')
                db.execute('UPDATE shares SET active=0 WHERE contact_id=?', (cid,))
                db.execute("UPDATE outbox SET state='CANCELLED_REVOKED',updated_at=? WHERE contact_id=? AND state='QUEUED'", (now(), cid))
                self.audit(db, uid, uid, 'CONTACT_REVOKED', cid)
                return 200, {'revoked': True}
            if path == '/api/events' and method == 'GET':
                rows = db.execute("SELECT DISTINCT e.* FROM events e LEFT JOIN shares s ON s.event_id=e.id LEFT JOIN contacts c ON c.id=s.contact_id WHERE e.wearer_id=? OR (e.state!='CLOSED' AND s.active=1 AND c.status='ACCEPTED' AND c.contact_user_id=?) ORDER BY e.received_at DESC LIMIT 200", (uid, uid)).fetchall()
                return 200, {'events': [self.event_dict(db, r) for r in rows]}
            parts = path.strip('/').split('/')
            if len(parts) >= 3 and parts[:2] == ['api', 'events']:
                event = self.event_access(db, user, parts[2])
                eid = event['id']
                if len(parts) == 3 and method == 'GET':
                    self.audit(db, event['wearer_id'], uid, 'EVENT_VIEWED', eid)
                    return 200, self.event_dict(db, event)
                if len(parts) == 4 and parts[3] == 'locations' and method == 'GET':
                    samples = [dict(json.loads(row['payload']),received_at=row['received_at']) for row in db.execute('SELECT * FROM location_samples WHERE event_id=? ORDER BY sequence DESC LIMIT 200', (eid,))]
                    self.audit(db,event['wearer_id'],uid,'LOCATION_SAMPLES_VIEWED',eid)
                    return 200, {'samples':samples}
                if len(parts) == 4 and method == 'POST':
                    action = parts[3]
                    require(event['state'] != 'CLOSED', 409, 'Event is closed')
                    if action == 'ack':
                        require(event['wearer_id'] != uid, 403, 'Only an authorized contact acknowledges')
                        db.execute('UPDATE shares SET acknowledged_at=? WHERE event_id=? AND contact_id IN (SELECT id FROM contacts WHERE contact_user_id=? AND status=?) AND active=1', (now(), eid, uid, 'ACCEPTED'))
                        self.audit(db, event['wearer_id'], uid, 'CONTACT_ACKNOWLEDGED', eid)
                        return 200, {'status': 'CONTACT_ACKNOWLEDGED', 'event_id': eid}
                    if action == 'response':
                        require(event['wearer_id'] != uid, 403, 'Only an authorized contact reports a response')
                        message = text(body.get('message'), 'message', 300)
                        db.execute('INSERT INTO responses VALUES(?,?,?,?,?)', (str(uuid.uuid4()), eid, uid, message, now()))
                        self.audit(db, event['wearer_id'], uid, 'CONTACT_DECLARED_RESPONSE', eid)
                        return 201, {'status': 'CONTACT_DECLARED_RESPONSE', 'event_id': eid, 'warning': 'Contact declaration; not verified emergency-service dispatch'}
                    self.event_access(db, user, eid, owner=True)
                    if action == 'share':
                        cid = text(body.get('contact_id'), 'contact_id', 36)
                        require(db.execute("SELECT 1 FROM contacts WHERE id=? AND wearer_id=? AND status='ACCEPTED'", (cid, uid)).fetchone(), 403, 'Accepted contact required')
                        prior = db.execute('SELECT active FROM shares WHERE event_id=? AND contact_id=?', (eid, cid)).fetchone()
                        db.execute('INSERT OR IGNORE INTO shares(event_id,contact_id) VALUES(?,?)', (eid, cid))
                        db.execute("INSERT OR IGNORE INTO outbox VALUES(?,?,?,'QUEUED',?,?)", (str(uuid.uuid4()), eid, cid, now(), now()))
                        if prior and not prior['active']:
                            db.execute('UPDATE shares SET active=1,acknowledged_at=NULL WHERE event_id=? AND contact_id=?', (eid, cid))
                            db.execute("UPDATE outbox SET state='QUEUED',updated_at=? WHERE event_id=? AND contact_id=?", (now(), eid, cid))
                        self.audit(db, uid, uid, 'EVENT_SHARED', eid)
                        status = db.execute('SELECT state FROM outbox WHERE event_id=? AND contact_id=?', (eid, cid)).fetchone()['state']
                        return 201, {'shared': True, 'event_id': eid, 'contact_id': cid, 'notification_status': status}
                    if action == 'cancellation':
                        db.execute("UPDATE events SET state='CANCELLATION_REQUESTED' WHERE id=?", (eid,))
                        self.audit(db, uid, uid, 'CANCELLATION_REQUESTED', eid)
                        return 200, {'state': 'CANCELLATION_REQUESTED', 'event_id': eid}
                    if action == 'close':
                        require(event['state'] == 'CANCELLATION_REQUESTED', 409, 'Request cancellation before closing')
                        reason = text(body.get('reason'), 'reason', 300)
                        db.execute("UPDATE events SET state='CLOSED',closed_at=?,close_reason=? WHERE id=?", (now(), reason, eid))
                        db.execute("UPDATE outbox SET state='CANCELLED_CLOSED',updated_at=? WHERE event_id=? AND state='QUEUED'", (now(), eid))
                        self.audit(db, uid, uid, 'EVENT_CLOSED', eid)
                        return 200, {'state': 'CLOSED', 'event_id': eid}
            if path == '/api/audit' and method == 'GET':
                return 200, {'audit': [dict(r) for r in db.execute('SELECT * FROM audit WHERE wearer_id=? ORDER BY id DESC LIMIT 200', (uid,))]}
            if path == '/api/simulation/dispatch' and method == 'POST':
                rows = db.execute("SELECT o.* FROM outbox o JOIN events e ON e.id=o.event_id WHERE e.wearer_id=? AND o.state='QUEUED'", (uid,)).fetchall()
                for item in rows:
                    valid = db.execute("SELECT 1 FROM shares s JOIN contacts c ON c.id=s.contact_id JOIN events e ON e.id=s.event_id WHERE s.event_id=? AND s.contact_id=? AND s.active=1 AND c.status='ACCEPTED' AND e.state!='CLOSED'", (item['event_id'], item['contact_id'])).fetchone()
                    db.execute('UPDATE outbox SET state=?,updated_at=? WHERE id=?', ('SIMULATED_ONLY' if valid else 'CANCELLED_REVOKED', now(), item['id']))
                    self.audit(db, uid, uid, 'SIMULATED_NOTIFICATION_ATTEMPT', item['event_id'])
                return 200, {'processed': len(rows), 'status': 'SIMULATED_ONLY', 'actual_notifications_sent': 0}
            raise ApiError(404, 'Route unavailable')


def handler(service, web_root):
    class Handler(BaseHTTPRequestHandler):
        server_version = 'MzansiLocal/0.1'
        def log_message(self, fmt, *args):
            pass  # Do not put tokens, URLs, email or location into request logs.
        def send(self, status, data, content_type='application/json; charset=utf-8'):
            raw = json.dumps(data, allow_nan=False).encode() if content_type.startswith('application/json') else data
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(raw)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
            self.end_headers()
            self.wfile.write(raw)
        def handle_request(self):
            try:
                require(self.headers.get('Host') in ('127.0.0.1:' + str(self.server.server_port), 'localhost:' + str(self.server.server_port), '10.0.2.2:' + str(self.server.server_port)), 403, 'Invalid host')
                origin = self.headers.get('Origin')
                require(not origin or origin in ('http://127.0.0.1:' + str(self.server.server_port), 'http://localhost:' + str(self.server.server_port)), 403, 'Origin denied')
                path = self.path.split('?')[0]
                if not path.startswith('/api/') and self.command == 'GET':
                    target = (web_root / ('index.html' if path == '/' else path.lstrip('/'))).resolve()
                    require(target.is_relative_to(web_root.resolve()) and target.is_file(), 404, 'File unavailable')
                    return self.send(200, target.read_bytes(), mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
                length = int(self.headers.get('Content-Length', '0'))
                require(0 <= length <= 16384, 413, 'Body too large')
                if self.command in ('POST', 'DELETE'):
                    ip = self.client_address[0]
                    bucket = (ip, int(time.time() // 60))
                    self.server.rate[bucket] = self.server.rate.get(bucket, 0) + 1
                    require(self.server.rate[bucket] <= 120, 429, 'Request rate exceeded')
                    if len(self.server.rate) > 100:
                        self.server.rate = {k:v for k,v in self.server.rate.items() if k[1] >= bucket[1]-1}
                body = json.loads(self.rfile.read(length)) if length else {}
                bearer = self.headers.get('Authorization', '')
                token = bearer[7:] if bearer.startswith('Bearer ') else ''
                status, data = service.call(self.command, path, body, token)
                self.send(status, data)
            except ApiError as error:
                self.send(error.status, {'error': error.message})
            except (ValueError, UnicodeError):
                self.send(400, {'error': 'Invalid request'})
            except Exception:
                self.send(500, {'error': 'Internal error; operation not acknowledged'})
        do_GET = do_POST = do_DELETE = handle_request
    return Handler


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='LOCAL ONLY safety workflow prototype; not an emergency service')
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--db', default=str(Path(__file__).parent / 'runtime' / 'prototype.sqlite3'))
    args = parser.parse_args()
    service = Service(args.db)
    web = Path(__file__).resolve().parent.parent / 'clients' / 'web'
    http = ThreadingHTTPServer(('127.0.0.1', args.port), handler(service, web))
    http.rate = {}
    print(f'Local prototype: http://127.0.0.1:{args.port} — notifications SIMULATED ONLY', flush=True)
    http.serve_forever()
