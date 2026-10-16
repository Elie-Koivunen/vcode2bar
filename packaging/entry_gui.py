"""Entry point of the packaged GUI program (vcode2bar.exe on Windows, started from the Start menu).

A windowed Windows program has no console, so sys.stdout/sys.stderr are None there; messages go to
a log file in the settings folder instead of being lost (or crashing a print call).
"""
import sys

import vcode2bar


def _log_stream():
    try:
        path = vcode2bar.CONFIG_PATH.parent / "vcode2bar.log"
        path.parent.mkdir(parents=True, exist_ok=True)
        return open(path, "a", encoding="utf-8", buffering=1)
    except OSError:
        return None


if sys.stdout is None or sys.stderr is None:
    stream = _log_stream()
    if stream is not None:
        sys.stdout = sys.stdout or stream
        sys.stderr = sys.stderr or stream

if len(sys.argv) > 1:          # a code or options given (e.g. "Open with"): same as the command line
    vcode2bar.cli()
else:
    vcode2bar.gui_main()
