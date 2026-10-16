#!/usr/bin/env python3
"""Run the web version's test page in a headless browser and report the result.

    python web/tools/run_browser_tests.py --browser google-chrome            (CI, Linux)
    python web/tools/run_browser_tests.py --browser "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

Serves web/ on http://127.0.0.1:<port>/, opens /tests/?report=1 in the browser, and waits until the
page POSTs its results to /__report. Prints every failure and the summary; exit code 0 = all passed,
1 = failures, 2 = no report (timeout or browser error). Only the standard library is needed.
"""
from __future__ import annotations

import argparse
import http.server
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from functools import partial
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    report: dict | None = None
    done = threading.Event()

    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm"}

    def do_POST(self):  # noqa: N802
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if self.path == "/__progress":              # one line per finished section / UI step
            print("  … " + body.decode("utf-8", "replace"), flush=True)
            self.send_response(204)
            self.end_headers()
            return
        if self.path != "/__report":
            self.send_error(404)
            return
        Handler.report = json.loads(body.decode("utf-8"))
        self.send_response(204)
        self.end_headers()
        Handler.done.set()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *_):  # quiet
        pass


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--browser", default=shutil.which("google-chrome") or shutil.which("chromium") or "chromium")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=0, help="0 = any free port")
    ap.add_argument("--timeout", type=int, default=600, help="seconds to wait for the report")
    a = ap.parse_args()

    class Server(http.server.ThreadingHTTPServer):
        def handle_error(self, request, client_address):       # a browser cancelling a download
            if not isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
                super().handle_error(request, client_address)

    srv = Server((a.host, a.port), partial(Handler, directory=str(WEB)))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/tests/?report=1"

    windows_browser = a.browser.lower().endswith(".exe")
    if windows_browser and shutil.which("cmd.exe"):      # Windows browser started from WSL: Windows temp
        win_tmp = subprocess.run(["cmd.exe", "/c", "echo %TEMP%"], capture_output=True, text=True,
                                 cwd="/mnt/c").stdout.strip().splitlines()[-1]
        prof_arg = f"{win_tmp}\\vcode2bar-browser-{int(time.time())}"
    else:
        prof_arg = tempfile.mkdtemp(prefix="vcode2bar-browser-")
    cmd = [a.browser, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
           "--disable-extensions", f"--user-data-dir={prof_arg}", url]
    if sys.platform.startswith("linux") and not windows_browser:
        cmd.insert(1, "--no-sandbox")
    print(f"serving {WEB} on port {port}; starting {Path(a.browser).name}", flush=True)
    t0 = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ok = Handler.done.wait(a.timeout)
    finally:
        proc.terminate()
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            proc.kill()
        srv.shutdown()
    if not ok or Handler.report is None:
        print(f"no report from the test page within {a.timeout} s", file=sys.stderr)
        return 2
    r = Handler.report
    print(f"browser: {r.get('userAgent', '?')}")
    for g in r.get("groups", []):
        print(f"  {'FAIL' if g['failed'] else 'PASS'} {g['name']}: {g['checks']} checks ({g['ms']} ms)")
    for f in r.get("failures", [])[:200]:
        print("  FAIL " + f)
    print(f"{r['summary']}  ({time.time() - t0:.0f} s)")
    return 0 if not r.get("fail") else 1


if __name__ == "__main__":
    sys.exit(main())
