import functools, http.server, socketserver, os
DIR = os.path.dirname(os.path.abspath(__file__))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIR)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 4321), H) as s:
    print("serving", DIR, "on http://127.0.0.1:4321")
    s.serve_forever()
