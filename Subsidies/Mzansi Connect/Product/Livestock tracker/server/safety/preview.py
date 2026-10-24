"""Local combined preview of the existing Mzansi pages and scoped prototype API."""
from pathlib import Path
from urllib.parse import unquote
from http.server import ThreadingHTTPServer
import argparse
import mimetypes

from app import Service, ApiError, handler, require


SITE = Path(__file__).resolve().parents[4]
TRACKER = SITE / 'Product' / 'Livestock tracker'
PUBLIC_ROUTES = {
    '/tracker/': TRACKER / 'web',
    '/livestock/': TRACKER / 'web',
    '/app/': SITE / 'Product' / 'Mzansi Connect App' / 'web',
    '/cloud/': SITE / 'Product' / 'Mzansi Cloud' / 'web',
    '/marketplace/': SITE / 'Product' / 'Mzansi Marketplace' / 'web',
    '/images/': SITE / 'images',
}
for name in ('Livestock tracker', 'Mzansi Connect App', 'Mzansi Cloud', 'Mzansi Marketplace'):
    PUBLIC_ROUTES['/Product/' + name + '/web/'] = SITE / 'Product' / name / 'web'
PUBLIC_EXTENSIONS = {'.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2'}


def public_file(raw_path):
    path = unquote(raw_path.split('?', 1)[0])
    selected_site = SITE
    if path.startswith('/Purple/'):
        selected_site = SITE if SITE.name == 'Purple' else SITE / 'Purple'
        path = path[len('/Purple'):]
    if path in ('/', '/index.html'):
        return selected_site / 'index.html'
    if path in ('/purple.css', '/purple.js') and selected_site.name == 'Purple':
        return selected_site / path.lstrip('/')
    if path == '/favicon.ico':
        candidate = selected_site / 'images' / 'Logo.png'
        return candidate if candidate.is_file() else None
    routes = {prefix: selected_site / directory.relative_to(SITE) for prefix, directory in PUBLIC_ROUTES.items()}
    for prefix, root in routes.items():
        if path.startswith(prefix):
            suffix = path[len(prefix):] or 'index.html'
            if chr(92) in suffix or Path(suffix).name in {'config.js', 'config.example.js'} or any(part.startswith('.') for part in Path(suffix).parts):
                return None
            candidate = (root / suffix).resolve()
            if candidate.is_relative_to(root.resolve()) and candidate.is_file() and candidate.suffix.lower() in PUBLIC_EXTENSIONS:
                return candidate
    return None


def site_handler(service):
    Base = handler(service, TRACKER / 'web')

    class SafetySiteHandler(Base):
        def send_header(self, keyword, value):
            if keyword.lower() == 'content-security-policy' and getattr(self, '_is_public_static', False):
                inline = " 'unsafe-inline'" if unquote(self.path.split('?', 1)[0]).removeprefix('/Purple') in ('/', '/index.html') else ''
                value = ("default-src 'self'; script-src 'self'" + inline + "; "
                         "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                         "font-src 'self' https://fonts.gstatic.com; "
                         "img-src 'self' data: https://*.tile.openstreetmap.org https://tile.openstreetmap.org; "
                         "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
            super().send_header(keyword, value)

        def handle_request(self):
            self._is_public_static = False
            if self.path.split('?', 1)[0].startswith('/api/'):
                return Base.handle_request(self)
            try:
                port = str(self.server.server_port)
                require(self.headers.get('Host') in ('127.0.0.1:' + port, 'localhost:' + port, '10.0.2.2:' + port), 403, 'Invalid host')
                require(self.command == 'GET', 405, 'Method unavailable')
                path = self.path.split('?', 1)[0]
                aliases = {'/tracker', '/livestock', '/app', '/cloud', '/marketplace', '/Purple', '/Purple/tracker', '/Purple/livestock', '/Purple/app', '/Purple/cloud', '/Purple/marketplace'}
                if path in aliases:
                    self.send_response(302)
                    self.send_header('Location', path + '/')
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return
                target = public_file(path)
                require(target is not None and target.is_file(), 404, 'Public page unavailable')
                self._is_public_static = True
                return self.send(200, target.read_bytes(), mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
            except ApiError as error:
                return self.send(error.status, {'error': error.message})
            except (ValueError, OSError):
                return self.send(404, {'error': 'Public page unavailable'})

        do_GET = do_POST = do_DELETE = handle_request
    return SafetySiteHandler


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Local women’s safety concept preview; simulated notifications only')
    parser.add_argument('--port', type=int, default=8790)
    parser.add_argument('--db', default=str(TRACKER / 'server' / 'safety' / 'runtime' / 'safety-preview.sqlite3'))
    args = parser.parse_args()
    api = Service(args.db)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), site_handler(api))
    server.rate = {}
    print(f'Local preview: http://127.0.0.1:{args.port}/ ; authenticated dashboard: /tracker/', flush=True)
    print('Development only. Synthetic records. Notifications simulated; no emergency service contacted.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
