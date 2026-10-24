"""Actual loopback HTTP boundaries using a temporary database and ephemeral port."""
import json
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest
from app import Service, handler


class HttpBoundaryTests(unittest.TestCase):
    def test_auth_host_origin_and_body_limits(self):
        with tempfile.TemporaryDirectory() as temp:
            service = Service(Path(temp) / 'test.sqlite3')
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler(service, Path(temp)))
            server.rate = {}
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            def request(method, path, data=None, headers=None):
                conn = HTTPConnection('127.0.0.1', server.server_port, timeout=5)
                conn.request(method, path, data, headers or {})
                response = conn.getresponse()
                result = response.status, json.loads(response.read())
                conn.close()
                return result
            try:
                self.assertEqual(request('GET','/api/health')[0],200)
                self.assertEqual(request('GET','/api/health',headers={'Host':'10.0.2.2:'+str(server.server_port)})[0],200)
                self.assertEqual(request('GET','/api/events')[0],401)
                self.assertEqual(request('GET','/api/health',headers={'Host':'attacker.example'})[0],403)
                self.assertEqual(request('GET','/api/health',headers={'Host':'10.0.2.2.attacker.example:'+str(server.server_port)})[0],403)
                self.assertEqual(request('POST','/api/register','{}',{'Origin':'https://attacker.example'})[0],403)
                self.assertEqual(request('POST','/api/register','{}',{'Host':'10.0.2.2:'+str(server.server_port),'Origin':'http://10.0.2.2:'+str(server.server_port)})[0],403)
                self.assertEqual(request('POST','/api/register','{' )[0],400)
                self.assertEqual(request('POST','/api/register','x'*16385)[0],413)
                status, registered = request('POST','/api/register',json.dumps({'email':'http@example.test','name':'HTTP bench','password':'long http password 123'}))
                self.assertEqual(status,201)
                self.assertEqual(request('GET','/api/devices',headers={'Authorization':'Bearer '+registered['token']})[1],{'devices':[]})
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)


if __name__ == '__main__':
    unittest.main(verbosity=2)
