#!/usr/bin/env python3
"""Serve the web version locally for development:  python web/tools/serve.py [--port 8765]

Then open http://127.0.0.1:8765/ (the app) or http://127.0.0.1:8765/tests/ (the test page).
Files are sent with "no-store" so every reload shows your latest edits, and with the right types
for .mjs and .wasm. Opening index.html straight from disk (file://) does not work: browsers block
the modules and the WebAssembly reader there.
"""
from __future__ import annotations

import argparse
import http.server
from functools import partial
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--bind", default="127.0.0.1")
    a = ap.parse_args()
    srv = http.server.ThreadingHTTPServer((a.bind, a.port), partial(NoCache, directory=str(WEB)))
    print(f"serving {WEB} at http://{a.bind}:{a.port}/  (Ctrl+C to stop)", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
