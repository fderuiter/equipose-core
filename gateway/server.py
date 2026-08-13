from http.server import HTTPServer, BaseHTTPRequestHandler
import os

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain; charset=utf-8')
        self.end_headers()
        
        app_name = os.environ.get('APP_NAME', 'unknown')
        response = f"Hello from {app_name}!\n\nReceived Headers:\n"
        for header, value in self.headers.items():
            response += f"{header}: {value}\n"
            
        self.wfile.write(response.encode('utf-8'))

    def do_POST(self):
        self.do_GET()

port = int(os.environ.get('APP_PORT', '80'))
print(f"Starting server on port {port}...")
httpd = HTTPServer(('0.0.0.0', port), SimpleHTTPRequestHandler)
httpd.serve_forever()
