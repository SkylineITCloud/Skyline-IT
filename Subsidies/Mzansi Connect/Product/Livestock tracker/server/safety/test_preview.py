import tempfile
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from app import Service
from preview import public_file, site_handler, SITE


class MergedPreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), site_handler(Service(Path(self.temp.name) / 'test.sqlite3')))
        self.http.rate = {}
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.base = 'http://127.0.0.1:' + str(self.http.server_port)

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.temp.cleanup()

    def get(self, path):
        return urlopen(Request(self.base + path), timeout=10)

    def test_existing_public_pages_and_assets_are_mounted(self):
        for page in ('/', '/tracker/', '/livestock/', '/app/', '/cloud/', '/marketplace/', '/tracker/vendor/leaflet/leaflet.js',
                     '/images/safety/safer-tomorrow.png', '/images/safety/tracker-family.png',
                     '/images/safety/personal-safety-concepts.png', '/images/safety/family-five-views.png'):
            with self.subTest(page=page), self.get(page) as response:
                self.assertEqual(response.status, 200)
                self.assertGreater(int(response.headers['Content-Length']), 100)

    def test_no_project_source_private_data_or_traversal(self):
        for path in ('/README.md', '/.git/config', '/server/.env', '/Product/Livestock%20tracker/server/safety/app.py',
                     '/Product/Livestock%20tracker/server/safety/runtime/safety-preview.sqlite3',
                     '/tracker/config.js', '/tracker/config.example.js', '/tracker/../../README.md', '/images/%2e%2e/README.md', '/tracker/%2eenv'):
            with self.subTest(path=path):
                self.assertIsNone(public_file(path))
                with self.assertRaises(HTTPError) as caught:
                    self.get(path)
                self.assertEqual(caught.exception.code, 404)
                caught.exception.close()

    def test_sensitive_api_stays_authenticated(self):
        with self.assertRaises(HTTPError) as caught:
            self.get('/api/events')
        self.assertEqual(caught.exception.code, 401)
        caught.exception.close()
        with self.assertRaises(HTTPError) as caught:
            self.get('/api/mzansi/livestock/latest')
        self.assertNotEqual(caught.exception.code, 200)
        caught.exception.close()

    def test_dashboard_script_policy_is_stricter_than_public_landing(self):
        with self.get('/') as landing, self.get('/tracker/') as dashboard:
            self.assertIn("script-src 'self' 'unsafe-inline'", landing.headers['Content-Security-Policy'])
            self.assertIn("script-src 'self';", dashboard.headers['Content-Security-Policy'])
            self.assertEqual(dashboard.headers['Cache-Control'], 'no-store')


    def test_purple_copy_and_new_product_images(self):
        with self.get('/') as response:
            original = response.read().decode('utf-8-sig')
        self.assertEqual(original.count('<figure class="product-visual"><img'), 3)
        self.assertIn('../index.html' if SITE.name == 'Purple' else 'Purple/index.html', original)
        with self.get('/Purple/') as response:
            purple = response.read().decode('utf-8-sig')
            self.assertIn("script-src 'self' 'unsafe-inline'", response.headers['Content-Security-Policy'])
        self.assertIn('Purple', purple)
        self.assertIn('purple-community.png', purple)
        self.assertIn('purple.css', purple)
        for suffix in ('purple.css', 'purple.js', 'tracker/', 'tracker/theme.css', 'tracker/theme.js', 'app/', 'cloud/', 'marketplace/', 'images/safety/pendant-product.png', 'images/safety/wristband-product.png', 'images/safety/clip-product.png', 'images/safety/purple-community.png'):
            with self.subTest(path=suffix), self.get('/Purple/' + suffix) as response:
                self.assertEqual(response.status, 200)
        self.assertIsNone(public_file('/Purple/images/../../Mzansi-Connect/index.html'))
        self.assertIsNone(public_file('/Purple/Product/Livestock%20tracker/server/safety/app.py'))

if __name__ == '__main__':
    unittest.main(verbosity=2)
