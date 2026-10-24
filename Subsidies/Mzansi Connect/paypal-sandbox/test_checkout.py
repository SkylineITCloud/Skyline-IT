import unittest
from unittest.mock import patch
from decimal import InvalidOperation
import server

class CheckoutTests(unittest.TestCase):
 def test_confirmed_pricing(self):
  for n,z,s in [(1,400,50),(2,775,75),(3,1150,100),(10,3775,275)]:
   q=server.quote(n,'0.05');self.assertEqual((q['zar'],q['service_zar']),(z,s));self.assertEqual(q['value'],format(z*.05,'.2f'))
 def test_invalid_quantity(self):
  for q in [0,11,True,'1',1.5,None]:
   with self.assertRaises(ValueError):server.quote(q,'0.05')
 def test_invalid_rate(self):
  for r in ['0','-1','NaN','Infinity','101']:
   with self.assertRaises(ValueError):server.quote(1,r)
 def test_no_relabelled_rand(self):
  q=server.quote(1,'0.05');self.assertEqual(q['value'],'20.00');self.assertEqual(q['currency'],'USD')
 def test_capture_verification(self):
  r={'id':'ORDER1','status':'COMPLETED','purchase_units':[{'payments':{'captures':[{'status':'COMPLETED','amount':{'currency_code':'USD','value':'20.00'}}]}}]}
  self.assertTrue(server.verify_capture(r,'ORDER1','20.00'))
  self.assertFalse(server.verify_capture(r,'OTHER','20.00'))
  self.assertFalse(server.verify_capture(r,'ORDER1','0.01'))
  r['purchase_units'][0]['payments']['captures'][0]['status']='PENDING'
  self.assertFalse(server.verify_capture(r,'ORDER1','20.00'))
 def test_live_api_absent(self):
  self.assertEqual(server.API,'https://api-m.sandbox.paypal.com')
class HttpTests(unittest.TestCase):
 def setUp(self):
  import tempfile,threading
  from pathlib import Path
  self.temp=tempfile.TemporaryDirectory();self.patch=patch.object(server,'DB',Path(self.temp.name)/'orders.sqlite3');self.patch.start()
  self.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
  self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
  self.base='http://127.0.0.1:'+str(self.http.server_port)
 def tearDown(self):
  self.http.shutdown();self.http.server_close();self.thread.join();self.patch.stop();self.temp.cleanup()
 def req(self,path,body=None,cookie=None,origin=server.ORIGIN):
  import json
  from urllib.request import Request,urlopen
  h={'Host':'127.0.0.1:8800','Origin':origin}
  if cookie:h['Cookie']=cookie
  if body is not None:h['Content-Type']='application/json'
  return urlopen(Request(self.base+path,data=None if body is None else json.dumps(body).encode(),headers=h),timeout=5)
 def test_csrf_and_private_files(self):
  from urllib.error import HTTPError
  for path in ['/server.py','/runtime/orders.sqlite3','/.env']:
   with self.assertRaises(HTTPError) as c:self.req(path)
   self.assertEqual(c.exception.code,404);c.exception.close()
  with self.assertRaises(HTTPError) as c:self.req('/orders',{'quantity':1},origin='https://evil.example')
  self.assertEqual(c.exception.code,403);c.exception.close()
 def test_persisted_capture_idempotency_and_price(self):
  import json
  with self.req('/') as r:cookie=r.headers['Set-Cookie'].split(';')[0]
  captured=[]
  def fake(path,payload=None,request_id=None):
   captured.append((path,payload,request_id))
   if path=='/v2/checkout/orders':
    return {'id':'ORDER1','links':[{'rel':'payer-action','href':'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1'}]}
   return {'id':'ORDER1','status':'COMPLETED','purchase_units':[{'payments':{'captures':[{'status':'COMPLETED','amount':{'currency_code':'USD','value':'20.00'}}]}}]}
  with patch.dict(server.os.environ,{'PAYPAL_SANDBOX_USD_PER_ZAR':'0.05'}),patch.object(server,'request_api',side_effect=fake):
   with self.req('/orders',{'quantity':1,'amount':'0.01'},cookie) as r:self.assertEqual(r.status,201)
   self.assertEqual(captured[0][1]['purchase_units'][0]['amount']['value'],'20.00')
   for _ in range(2):
    with self.req('/capture',{'id':'ORDER1'},cookie) as r:self.assertEqual(json.load(r)['status'],'COMPLETED')
   self.assertEqual(len(captured),2)
   from urllib.error import HTTPError
   with self.assertRaises(HTTPError) as c:self.req('/capture',{'id':'ORDER1'},'sandbox_session='+'f'*64)
   self.assertEqual(c.exception.code,404);c.exception.close()
if __name__=='__main__':unittest.main()
