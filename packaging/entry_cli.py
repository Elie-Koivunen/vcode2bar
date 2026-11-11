# Copyright (c) 2026 Elie Koivunen
# SPDX-License-Identifier: LGPL-3.0-only
"""Entry point of the packaged command-line program (vcode2bar-cli.exe on Windows, vcode2bar on Linux).
Without arguments it opens the GUI, exactly like `python vcode2bar.py`."""
import vcode2bar

vcode2bar.cli()
