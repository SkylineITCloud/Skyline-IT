import copy
import tempfile
import unittest
import uuid
from pathlib import Path
from app import Service, ApiError


class SafetyWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / 'test.sqlite3'
        self.service = Service(self.db)
        self.owner = self.register('wearer@example.test')
        self.contact = self.register('contact@example.test')
        self.stranger = self.register('stranger@example.test')
        _, result = self.service.call('POST', '/api/devices', {'name':'Pendant bench','form_factor':'pendant'}, self.owner)
        self.device, self.device_token = result['device'], result['device_token']
        self.payload = {'event_id':str(uuid.uuid4()),'sequence':1,'captured_at':None,'clock_quality':'UNKNOWN','location':None,'battery_v':3.8,'connectivity':'SIMULATED'}

    def tearDown(self):
        self.temp.cleanup()

    def register(self, email):
        return self.service.call('POST','/api/register',{'email':email,'password':'a long test password 123','name':'Test'},'')[1]['token']

    def ingest(self):
        return self.service.call('POST','/api/device/events',self.payload,self.device_token)

    def assert_error(self, status, method, path, body=None, token=''):
        with self.assertRaises(ApiError) as caught:
            self.service.call(method,path,body,token)
        self.assertEqual(caught.exception.status,status)

    def accepted_contact(self):
        _, invite = self.service.call('POST','/api/contacts/invitations',{'email':'contact@example.test'},self.owner)
        self.service.call('POST','/api/contacts/invitations/accept',{'invitation_token':invite['invitation_token']},self.contact)
        return invite['contact']['id']

    def test_unauthenticated_and_cross_user_isolation(self):
        self.ingest()
        eid = self.payload['event_id']
        self.assert_error(401,'GET','/api/events')
        self.assert_error(404,'GET','/api/events/'+eid,token=self.stranger)
        self.assertEqual(self.service.call('GET','/api/events',token=self.stranger)[1]['events'],[])
        self.assert_error(401,'POST','/api/device/events',self.payload,self.owner)

    def test_idempotency_and_replay_are_durable(self):
        status, receipt = self.ingest()
        self.assertEqual(status,201)
        self.assertEqual(receipt['status'],'BACKEND_RECEIVED')
        self.service = Service(self.db) # restart uses same durable DB
        for _ in range(1000):
            status, retry = self.ingest()
            self.assertEqual(status,200)
            self.assertTrue(retry['duplicate'])
        self.assertEqual(len(self.service.call('GET','/api/events',token=self.owner)[1]['events']),1)
        changed = copy.deepcopy(self.payload)
        changed['battery_v'] = 3.9
        self.assert_error(409,'POST','/api/device/events',changed,self.device_token)
        changed['event_id'] = str(uuid.uuid4())
        self.assert_error(409,'POST','/api/device/events',changed,self.device_token)

    def test_contact_scope_revocation_and_pending_notification(self):
        cid = self.accepted_contact()
        self.ingest()
        eid = self.payload['event_id']
        self.assert_error(404,'GET','/api/events/'+eid,token=self.contact)
        self.service.call('POST','/api/events/'+eid+'/share',{'contact_id':cid},self.owner)
        self.assertEqual(self.service.call('GET','/api/events/'+eid,token=self.contact)[1]['location'],None)
        self.service.call('DELETE','/api/contacts/'+cid,token=self.owner)
        self.assert_error(404,'GET','/api/events/'+eid,token=self.contact)
        dispatch = self.service.call('POST','/api/simulation/dispatch',{},self.owner)[1]
        self.assertEqual(dispatch['processed'],0)
        self.assertEqual(dispatch['actual_notifications_sent'],0)
        self.assertEqual(self.service.call('GET','/api/events/'+eid,token=self.owner)[1]['shares'][0]['notification_status'],'CANCELLED_REVOKED')

    def test_invitation_expiry_and_wrong_identity(self):
        _, invite = self.service.call('POST','/api/contacts/invitations',{'email':'contact@example.test'},self.owner)
        self.assert_error(403,'POST','/api/contacts/invitations/accept',{'invitation_token':invite['invitation_token']},self.stranger)
        with self.service.connect() as db:
            db.execute('UPDATE contacts SET expires=0')
        self.assert_error(403,'POST','/api/contacts/invitations/accept',{'invitation_token':invite['invitation_token']},self.contact)

    def test_reinvitation_does_not_restore_old_grants(self):
        cid = self.accepted_contact()
        self.ingest()
        eid = self.payload['event_id']
        self.service.call('POST','/api/events/'+eid+'/share',{'contact_id':cid},self.owner)
        self.service.call('DELETE','/api/contacts/'+cid,token=self.owner)
        new_cid = self.accepted_contact()
        self.assertEqual(new_cid,cid)
        self.assert_error(404,'GET','/api/events/'+eid,token=self.contact)
        self.service.call('POST','/api/events/'+eid+'/share',{'contact_id':cid},self.owner)
        self.assertEqual(self.service.call('GET','/api/events/'+eid,token=self.contact)[1]['state'],'ACTIVE')

    def test_simulated_notification_never_becomes_delivery(self):
        cid = self.accepted_contact()
        self.ingest()
        eid = self.payload['event_id']
        self.service.call('POST','/api/events/'+eid+'/share',{'contact_id':cid},self.owner)
        result = self.service.call('POST','/api/simulation/dispatch',{},self.owner)[1]
        self.assertEqual(result['status'],'SIMULATED_ONLY')
        self.assertEqual(result['actual_notifications_sent'],0)
        event = self.service.call('GET','/api/events/'+eid,token=self.owner)[1]
        self.assertEqual(event['shares'][0]['notification_status'],'SIMULATED_ONLY')
        self.service.call('POST','/api/events/'+eid+'/ack',{},self.contact)
        self.assertIsNotNone(self.service.call('GET','/api/events/'+eid,token=self.owner)[1]['shares'][0]['acknowledged_at'])

    def test_contact_cannot_cancel_or_close(self):
        cid = self.accepted_contact()
        self.ingest()
        eid = self.payload['event_id']
        self.service.call('POST','/api/events/'+eid+'/share',{'contact_id':cid},self.owner)
        self.assert_error(404,'POST','/api/events/'+eid+'/cancellation',{},self.contact)
        self.assert_error(409,'POST','/api/events/'+eid+'/close',{'reason':'test'},self.owner)
        self.service.call('POST','/api/events/'+eid+'/cancellation',{},self.owner)
        self.service.call('POST','/api/events/'+eid+'/close',{'reason':'Staged test complete'},self.owner)
        self.assert_error(404,'GET','/api/events/'+eid,token=self.contact)
        self.assertEqual(self.service.call('GET','/api/events/'+eid,token=self.owner)[1]['state'],'CLOSED')

    def test_no_location_and_invalid_location(self):
        self.ingest()
        bad = copy.deepcopy(self.payload)
        bad.update(event_id=str(uuid.uuid4()),sequence=2,location={'latitude':91,'longitude':31,'source':'GNSS'})
        self.assert_error(400,'POST','/api/device/events',bad,self.device_token)
        bad['location']['latitude'] = True
        self.assert_error(400,'POST','/api/device/events',bad,self.device_token)
        bad['location']['latitude'] = -29.8
        bad['location']['longitude'] = float('nan')
        self.assert_error(400,'POST','/api/device/events',bad,self.device_token)

    def test_session_and_device_revocation(self):
        self.service.call('DELETE','/api/devices/'+self.device['id'],token=self.owner)
        self.assert_error(401,'POST','/api/device/events',self.payload,self.device_token)
        self.service.call('POST','/api/logout',{},self.owner)
        self.assert_error(401,'GET','/api/events',token=self.owner)

    def test_ongoing_samples_idempotency_ordering_and_immutable_activation(self):
        self.ingest()
        eid = self.payload['event_id']
        path = '/api/device/events/'+eid+'/locations'
        sample = {'sample_id':str(uuid.uuid4()),'sequence':1,'captured_at':'2026-10-24T12:01:00Z','clock_quality':'GNSS','location':{'latitude':-29.86,'longitude':31.02,'accuracy_m':15,'source':'GNSS'},'battery_v':3.7,'connectivity':'SIMULATED'}
        status, receipt = self.service.call('POST',path,sample,self.device_token)
        self.assertEqual(status,201)
        self.assertEqual(receipt['sample_id'],sample['sample_id'])
        self.service = Service(self.db)
        self.assertTrue(self.service.call('POST',path,sample,self.device_token)[1]['duplicate'])
        changed = copy.deepcopy(sample)
        changed['battery_v'] = 3.5
        self.assert_error(409,'POST',path,changed,self.device_token)
        changed['sample_id'] = str(uuid.uuid4())
        self.assert_error(409,'POST',path,changed,self.device_token)
        changed.update(sequence=2,location=None,captured_at=None,clock_quality='UNKNOWN')
        self.service.call('POST',path,changed,self.device_token)
        event = self.service.call('GET','/api/events/'+eid,token=self.owner)[1]
        self.assertIsNone(event['location']) # activation no-fix remains immutable
        self.assertIsNone(event['captured_at'])
        self.assertEqual(event['latest_sample']['sequence'],2)
        self.assertIsNone(event['latest_sample']['location']) # never substitute older fix as current
        samples = self.service.call('GET','/api/events/'+eid+'/locations',token=self.owner)[1]['samples']
        self.assertEqual([s['sequence'] for s in samples],[2,1])
        changed.update(sample_id=str(uuid.uuid4()),sequence=3,location={'latitude':-29,'longitude':999,'source':'GNSS'})
        self.assert_error(400,'POST',path,changed,self.device_token)

    def test_sample_device_scope_contact_revocation_and_closed_event(self):
        self.ingest()
        eid = self.payload['event_id']
        path = '/api/device/events/'+eid+'/locations'
        sample = {'sample_id':str(uuid.uuid4()),'sequence':1,'location':None,'captured_at':None}
        _, other = self.service.call('POST','/api/devices',{'name':'Another device','form_factor':'clip'},self.owner)
        self.assert_error(404,'POST',path,sample,other['device_token'])
        self.assert_error(401,'POST',path,sample,self.owner)
        cid = self.accepted_contact()
        self.assert_error(404,'GET','/api/events/'+eid+'/locations',token=self.contact)
        self.service.call('POST','/api/events/'+eid+'/share',{'contact_id':cid},self.owner)
        self.service.call('POST',path,sample,self.device_token)
        self.assertEqual(len(self.service.call('GET','/api/events/'+eid+'/locations',token=self.contact)[1]['samples']),1)
        self.service.call('DELETE','/api/contacts/'+cid,token=self.owner)
        self.assert_error(404,'GET','/api/events/'+eid+'/locations',token=self.contact)
        self.service.call('POST','/api/events/'+eid+'/cancellation',{},self.owner)
        self.service.call('POST','/api/events/'+eid+'/close',{'reason':'Bench complete'},self.owner)
        self.assert_error(409,'POST',path,sample,self.device_token)
        self.assertEqual(len(self.service.call('GET','/api/events/'+eid+'/locations',token=self.owner)[1]['samples']),1)
        self.service.call('DELETE','/api/devices/'+self.device['id'],token=self.owner)
        self.assert_error(401,'POST',path,sample,self.device_token)


if __name__ == '__main__':
    unittest.main(verbosity=2)
