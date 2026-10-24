"""Loopback-only PayPal sandbox harness. Never uses the live API."""
import base64
import hashlib
import json
import os
import secrets
import sqlite3
import time
from decimal import Decimal, ROUND_HALF_UP
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API = "https://api-m.sandbox.paypal.com"
ROOT = Path(__file__).resolve().parent
PORT = 8800
ORIGIN = "http://127.0.0.1:8800"
DB = ROOT / "runtime" / "orders.sqlite3"

def quote(quantity, rate):
    if type(quantity) is not int or not 1 <= quantity <= 10:
        raise ValueError("Choose 1 to 10 devices")
    rate = Decimal(rate)
    if not rate.is_finite() or not Decimal("0.000001") <= rate <= Decimal("100"):
        raise ValueError("Configure an explicit sandbox USD per ZAR rate")
    service = 50 + 25 * (quantity - 1)
    zar = 350 * quantity + service
    usd = (Decimal(zar) * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if usd < Decimal("0.01"):
        raise ValueError("Converted test amount is too small")
    return {"quantity": quantity, "zar": zar, "service_zar": service, "currency": "USD", "value": str(usd), "test_usd_per_zar": str(rate)}

class ClosingConnection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()

def connect():
    DB.parent.mkdir(exist_ok=True)
    c = sqlite3.connect(DB, factory=ClosingConnection)
    c.execute("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, owner TEXT NOT NULL, amount TEXT NOT NULL, zar INTEGER NOT NULL, capture_key TEXT NOT NULL, status TEXT NOT NULL, result TEXT)")
    return c

def request_api(path, payload=None, request_id=None):
    cid = os.environ.get("PAYPAL_SANDBOX_CLIENT_ID", "")
    secret = os.environ.get("PAYPAL_SANDBOX_CLIENT_SECRET", "")
    if not cid or not secret:
        raise ValueError("Sandbox credentials are not configured on the server")
    auth = base64.b64encode((cid + ":" + secret).encode()).decode()
    req = Request(API + "/v1/oauth2/token", data=b"grant_type=client_credentials", headers={"Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded"})
    with urlopen(req, timeout=20) as r:
        token = json.load(r)["access_token"]
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}
    if request_id:
        headers["PayPal-Request-Id"] = request_id
    req = Request(API + path, data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
    with urlopen(req, timeout=25) as r:
        return json.load(r)

def verify_capture(result, order_id, amount):
    if result.get("id") != order_id or result.get("status") != "COMPLETED":
        return False
    units = result.get("purchase_units", [])
    if len(units) != 1:
        return False
    captures = units[0].get("payments", {}).get("captures", [])
    return len(captures) == 1 and captures[0].get("status") == "COMPLETED" and captures[0].get("amount") == {"currency_code": "USD", "value": amount}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, status, body, cookie=None):
        raw = body.encode() if isinstance(body, str) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8" if isinstance(body, str) else "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if cookie:
            self.send_header("Set-Cookie", "sandbox_session=" + cookie + "; HttpOnly; SameSite=Lax; Path=/")
        self.end_headers()
        self.wfile.write(raw)

    def session(self):
        from http.cookies import SimpleCookie
        c = SimpleCookie(self.headers.get("Cookie", ""))
        s = c.get("sandbox_session")
        value = s.value if s else ""
        return value if len(value) == 64 and all(x in "0123456789abcdef" for x in value) else None

    def do_GET(self):
        if self.headers.get("Host") != "127.0.0.1:8800":
            return self.send(403, {"error": "Use the loopback address"})
        path = self.path.split("?", 1)[0]
        if path == "/":
            return self.send(200, (ROOT / "index.html").read_text(encoding="utf-8"), self.session() or secrets.token_hex(32))
        if path in ("/checkout.js", "/style.css"):
            raw = (ROOT / path[1:]).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript" if path.endswith("js") else "text/css")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            return self.wfile.write(raw)
        return self.send(404, {"error": "Not found"})

    def do_POST(self):
        if self.headers.get("Host") != "127.0.0.1:8800" or self.headers.get("Origin") != ORIGIN or not self.session():
            return self.send(403, {"error": "Open checkout locally first"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if not 0 < n <= 2048 or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.send(400, {"error": "Invalid request"})
            body = json.loads(self.rfile.read(n))
            if not isinstance(body, dict):
                raise ValueError("Invalid request")
            owner = hashlib.sha256(self.session().encode()).hexdigest()
            if self.path == "/quote":
                return self.send(200, quote(body.get("quantity"), os.environ.get("PAYPAL_SANDBOX_USD_PER_ZAR", "0")))
            if self.path == "/orders":
                q = quote(body.get("quantity"), os.environ.get("PAYPAL_SANDBOX_USD_PER_ZAR", "0"))
                key = secrets.token_hex(16)
                result = request_api("/v2/checkout/orders", {"intent": "CAPTURE", "purchase_units": [{"description": "Mzansi sandbox: one month only, no subscription or shipment", "amount": {"currency_code": "USD", "value": q["value"]}}], "payment_source": {"paypal": {"experience_context": {"return_url": ORIGIN + "/?approved=1", "cancel_url": ORIGIN + "/?cancelled=1", "user_action": "PAY_NOW", "shipping_preference": "NO_SHIPPING"}}}}, key)
                approval = next((x["href"] for x in result.get("links", []) if x.get("rel") in ("payer-action", "approve")), "")
                from urllib.parse import urlsplit
                u = urlsplit(approval)
                if u.scheme != "https" or u.hostname != "www.sandbox.paypal.com":
                    raise ValueError("PayPal did not provide a valid sandbox approval link")
                with connect() as c:
                    c.execute("INSERT INTO orders VALUES (?,?,?,?,?,?,?)", (result["id"], owner, q["value"], q["zar"], secrets.token_hex(16), "CREATED", None))
                return self.send(201, {"id": result["id"], "approval": approval})
            if self.path == "/capture":
                order_id = body.get("id")
                with connect() as c:
                    row = c.execute("SELECT amount,capture_key,status,result FROM orders WHERE id=? AND owner=?", (order_id, owner)).fetchone()
                if not row:
                    return self.send(404, {"error": "Order not found in this browser session"})
                if row[2] == "COMPLETED":
                    return self.send(200, json.loads(row[3]))
                result = request_api("/v2/checkout/orders/" + order_id + "/capture", {}, row[1])
                if not verify_capture(result, order_id, row[0]):
                    return self.send(409, {"error": "Payment is not confirmed. No order fulfilled."})
                receipt = {"id": order_id, "status": "COMPLETED", "currency": "USD", "value": row[0], "sandbox": True}
                with connect() as c:
                    c.execute("UPDATE orders SET status='COMPLETED',result=? WHERE id=? AND owner=?", (json.dumps(receipt), order_id, owner))
                return self.send(200, receipt)
            return self.send(404, {"error": "Not found"})
        except (ValueError, TypeError, KeyError):
            return self.send(400, {"error": "Check quantity, explicit sandbox conversion rate and server credentials"})
        except Exception:
            return self.send(502, {"error": "PayPal sandbox request failed; retry capture using the same order. No fulfilment performed."})

if __name__ == "__main__":
    print("Sandbox checkout only: " + ORIGIN + "/")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
