# Server/server.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import urllib.parse
from pathlib import Path
import os
from handler import ProcessPrompt

# Get the parent directory path
PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class AIRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Change to the parent directory to serve files from project root
        os.chdir(PARENT_DIR)
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        # Serve files from the correct directories
        if self.path == '/':
            self.path = '/Code/index.html'
        elif self.path.startswith('/'):
            # Check if file exists, otherwise serve from appropriate directory
            file_path = self.path[1:]  # Remove leading slash
            
            # Check if the file exists in the project root
            if not os.path.exists(file_path):
                # For other paths, serve from appropriate directories
                if self.path.startswith('/A.I.s'):
                    self.path = self.path
                elif self.path.startswith('/Images'):
                    self.path = self.path
                else:
                    self.path = f'/Code{self.path}'
        
        return super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/AIrequest':
            # Handle AI requests
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse the JSON data
            try:
                data = json.loads(post_data.decode('utf-8'))
                string = data.get('string', '')
                name = data.get('name', 'Unknown')
                
                # Log the prompt to console
                ResultString = ProcessPrompt(name , string)

                # Send response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                # Create a simple response
                response = json.dumps({
                    'reply': ResultString
                })
                
                self.wfile.write(response.encode('utf-8'))
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = json.dumps({'error': str(e)})
                self.wfile.write(response.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=AIRequestHandler, port=8000):
    # Change to parent directory before starting server
    os.chdir(PARENT_DIR)
    
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting server on port {port}...')
    print('Server will log all AI prompts to the console')
    print(f'Serving files from: {PARENT_DIR}')
    httpd.serve_forever()

if __name__ == '__main__':
    run()