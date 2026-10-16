#!/usr/bin/env python3
"""Build the vcode2bar release packages for the current platform.

    python packaging/build.py [--out DIR] [--selftest] [--no-installer]

Windows: vcode2bar-<v>-windows-x64-portable.zip and vcode2bar-<v>-windows-x64-setup.exe (Inno Setup 6)
Linux:   vcode2bar-<v>-linux-x64-portable.tar.gz and vcode2bar-<v>-linux-x64-setup.sh
plus SHA256SUMS-<platform>.txt.

Needs the pinned tools from packaging/requirements.txt; on Windows also Inno Setup 6 (ISCC.exe on
PATH, in its default folder, or in the ISCC environment variable). Every package is smoke-tested
here: --version/--about/--licenses/--deps, a real render with read-back, and (with --selftest) the
full built-in test suite; on Linux the setup script is also installed and uninstalled once.
"""
from __future__ import annotations

import argparse
import configparser
import hashlib
import importlib.metadata as md
import os
import re
import shutil
import subprocess
import sys
import sysconfig
import tarfile
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "packaging"
WINDOWS = sys.platform == "win32"
PLATFORM = "windows-x64" if WINDOWS else "linux-x64"
SAMPLE = "479440520200360820048831500000000868516259619897100612"   # official test invoice 1


def version() -> str:
    m = re.search(r'^__version__ = "([^"]+)"', (ROOT / "vcode2bar.py").read_text(encoding="utf-8"), re.M)
    return m.group(1)


def project() -> configparser.ConfigParser:
    cp = configparser.ConfigParser(interpolation=None)
    cp.read(ROOT / "project.ini", encoding="utf-8")
    return cp


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def pinned() -> dict[str, str]:
    """file name -> sha256 from third-party-sources.txt"""
    out = {}
    for line in (PKG / "third-party-sources.txt").read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) >= 2 and not line.startswith("#"):
            out[parts[1]] = parts[0]
    return out


def run(cmd, **kw) -> subprocess.CompletedProcess:
    print("  $", " ".join(str(c) for c in cmd), flush=True)
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


# ---------------------------------------------------------------- licences
def dist_license_files(name: str) -> list:
    files = md.distribution(name).files or []
    return [f for f in files if re.search(r"(licen[cs]e|copying|notice|authors)", str(f), re.I)
            and "dist-info" in str(f)]


def collect_licenses(app: Path) -> None:
    lic = app / "licenses"
    lic.mkdir()
    # Python itself
    for cand in (Path(sys.base_prefix) / "LICENSE.txt", Path(sysconfig.get_paths()["stdlib"]) / "LICENSE.txt",
                 Path(sys.base_prefix) / "share" / "doc" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "copyright"):
        if cand.is_file():
            (lic / "python").mkdir()
            shutil.copy2(cand, lic / "python" / "LICENSE.txt")
            break
    else:
        sys.exit("Python's LICENSE.txt not found - cannot ship without it")
    (lic / "tcl-tk").mkdir()
    shutil.copy2(PKG / "licenses" / "tcl-tk-license.terms", lic / "tcl-tk" / "license.terms")
    for dist, folder in (("python-barcode", "python-barcode"), ("pillow", "pillow"), ("pyzbar", "pyzbar"),
                         ("pypdfium2", "pypdfium2"), ("pyinstaller", "pyinstaller")):
        files = dist_license_files(dist)
        if not files:
            sys.exit(f"no licence file found in the {dist} package")
        for f in files:
            src = Path(f.locate())
            rel = Path(*[p for p in f.parts if not p.endswith(".dist-info") and p != "licenses"])
            dst = lic / folder / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    if WINDOWS:
        shutil.copy2(PKG / "licenses" / "lgpl-2.1.txt", lic / "lgpl-2.1.txt")
        shutil.copy2(PKG / "licenses" / "inno-setup-license.txt", lic / "inno-setup-license.txt")


def package_readme(v: str, cp: configparser.ConfigParser) -> str:
    p = cp["project"]
    lic = cp["license"]
    prereq = ("Windows: everything is included. Reading barcodes from images and PDFs needs the Microsoft\n"
              "Visual C++ 2013 runtime (x64); the installer offers it, for the portable version get\n"
              "vcredist_x64.exe from microsoft.com if 'vcode2bar-cli --deps' reports zbar as missing.\n"
              if WINDOWS else
              "Linux: reading barcodes from images and PDFs needs the ZBar library from your distribution:\n"
              "  Debian/Ubuntu: sudo apt install libzbar0t64   (Ubuntu 22.04 / Debian 12: libzbar0)\n"
              "  Fedora: sudo dnf install zbar-libs   openSUSE: sudo zypper install libzbar0   Arch: sudo pacman -S zbar\n"
              "The setup script (…-setup.sh) checks this and offers to install it.\n")
    start = ("Start vcode2bar.exe (window) or vcode2bar-cli.exe (command line, e.g. 'vcode2bar-cli --help')."
             if WINDOWS else "Start ./vcode2bar (without arguments it opens the window; './vcode2bar --help' for the command line).")
    return (f"{p.get('name')} {v} - {p.get('description')}\n\n"
            f"{start}\n\n{prereq}\n"
            f"Licence: {lic.get('name')} - {lic.get('summary')} (see LICENSE)\n"
            f"Third-party components and their licences: THIRD-PARTY-NOTICES.txt and the licenses folder.\n"
            f"{p.get('copyright')}\nWebsite: {p.get('website')}\nContact: {p.get('contact')}\n")


# ---------------------------------------------------------------- tests of the built program
def smoke_test(app: Path, v: str, full_selftest: bool) -> None:
    cli = app / ("vcode2bar-cli.exe" if WINDOWS else "vcode2bar")
    env = dict(os.environ, PYTHONIOENCODING="utf-8")

    def out(*args, rc=0) -> str:
        r = subprocess.run([str(cli), *args], capture_output=True, text=True, encoding="utf-8", env=env, timeout=600)
        if r.returncode != rc:
            sys.exit(f"smoke test failed: {' '.join(args)} -> {r.returncode}\n{r.stdout}\n{r.stderr}")
        return r.stdout + r.stderr

    print("smoke tests:", flush=True)
    assert out("--version").strip() == f"vcode2bar {v}"
    about = out("--about", "--lang", "en")
    assert project()["license"]["name"] in about and project()["project"]["contact"] in about, about
    assert "zbar" in out("--licenses").lower()
    deps = out("--deps")
    print(deps)
    for name in ("python-barcode", "Pillow", "pyzbar", "pypdfium2"):
        assert any(line.startswith("OK") and name in line for line in deps.splitlines()), (name, deps)
    assert "4 883,15" in out("--decode", SAMPLE, "--lang", "en")
    with tempfile.TemporaryDirectory() as t:
        out(SAMPLE, "-o", str(Path(t) / "x"), "--format", "all", "--verify")      # render + zbar read-back
        assert all((Path(t) / f"x.{e}").exists() for e in ("png", "svg", "pdf"))
        found = out("--read", str(Path(t) / "x.pdf"), "--json")                    # PDFium + zbar
        assert SAMPLE in found, found
    if full_selftest:
        print(out("--selftest", "1"))
    print("smoke tests passed", flush=True)


def check_bundled_dlls(app: Path) -> None:
    """The Windows ZBar/libiconv DLLs must be exactly the ones whose sources we publish."""
    pins = pinned()
    for name in ("libzbar-64.dll", "libiconv.dll"):
        hits = list(app.rglob(name))
        if len(hits) != 1:
            sys.exit(f"expected exactly one {name} in the build, found {len(hits)}")
        if sha256(hits[0]) != pins[name]:
            sys.exit(f"{name} differs from the pinned file: update third-party-sources.txt and the sources")
        print(f"  {name}: matches the pinned checksum")


# ---------------------------------------------------------------- packages
def portable(app: Path, out: Path, v: str) -> Path:
    top = f"vcode2bar-{v}"
    if WINDOWS:
        dst = out / f"vcode2bar-{v}-{PLATFORM}-portable.zip"
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for f in sorted(app.rglob("*")):
                z.write(f, Path(top) / f.relative_to(app))
    else:
        dst = out / f"vcode2bar-{v}-{PLATFORM}-portable.tar.gz"
        with tarfile.open(dst, "w:gz", compresslevel=9) as tz:
            tz.add(app, arcname=top)
    return dst


def find_iscc() -> Path:
    for cand in (os.environ.get("ISCC"), shutil.which("ISCC"),
                 r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe", r"C:\Program Files\Inno Setup 6\ISCC.exe"):
        if cand and Path(cand).is_file():
            return Path(cand)
    sys.exit("Inno Setup 6 (ISCC.exe) not found: install it, or set ISCC to its path")


def installer_windows(app: Path, out: Path, v: str) -> Path:
    p = project()["project"]
    run([find_iscc(), "/Q", f"/DAppVersion={v}", f"/DSourceDir={app}", f"/DOutputDir={out}", f"/DRepoDir={ROOT}",
         f"/DAppName={p['name']}", f"/DAppPublisher={p['owner']}", f"/DAppURL={p['website']}",
         f"/DAppWebURL={p['web_app']}", f"/DAppContact={p['contact']}", PKG / "windows" / "vcode2bar.iss"])
    return out / f"vcode2bar-{v}-{PLATFORM}-setup.exe"


def installer_linux(app: Path, out: Path, v: str) -> Path:
    dst = out / f"vcode2bar-{v}-{PLATFORM}-setup.sh"
    header = (PKG / "linux" / "setup-header.sh").read_text(encoding="utf-8").replace("@VERSION@", v)
    assert header.endswith("__PAYLOAD_BELOW__\n")
    with tempfile.TemporaryDirectory() as t:
        payload = Path(t) / "payload.tar.gz"
        with tarfile.open(payload, "w:gz", compresslevel=9) as tz:
            tz.add(app, arcname="vcode2bar")
        with open(dst, "wb") as f:
            f.write(header.encode("utf-8"))
            f.write(payload.read_bytes())
    dst.chmod(0o755)
    return dst


def trial_install_linux(setup: Path, v: str) -> None:
    with tempfile.TemporaryDirectory() as t:
        prefix = Path(t) / "prefix"
        run(["sh", setup, "--yes", "--no-prerequisites", "--prefix", prefix])
        exe = prefix / "bin" / "vcode2bar"
        r = subprocess.run([str(exe), "--version"], capture_output=True, text=True, check=True)
        assert r.stdout.strip() == f"vcode2bar {v}", r.stdout
        assert (prefix / "share" / "applications" / "vcode2bar.desktop").is_file()
        run(["sh", prefix / "share" / "vcode2bar" / "setup.sh", "--uninstall", "--prefix", prefix])
        assert not exe.exists() and not (prefix / "share" / "vcode2bar").exists()
    print("trial install and uninstall passed", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=ROOT / "packaging" / "out", help="output folder (absolute)")
    ap.add_argument("--selftest", action="store_true", help="also run the full built-in test suite in the build")
    ap.add_argument("--no-installer", action="store_true", help="portable package only")
    a = ap.parse_args()
    out = a.out.resolve()
    v = version()
    if out.exists():
        shutil.rmtree(out)                              # build output only, never sources
    out.mkdir(parents=True)
    work = out / "work"

    print(f"building vcode2bar {v} for {PLATFORM}", flush=True)
    run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--distpath", out / "dist",
         "--workpath", work, PKG / "vcode2bar.spec"])
    app = out / "dist" / "vcode2bar"
    for f in ("LICENSE", "THIRD-PARTY-NOTICES.txt", "project.ini"):
        shutil.copy2(ROOT / f, app / f)
    shutil.copy2(PKG / "assets" / "vcode2bar.png", app / "vcode2bar.png")
    (app / "README.txt").write_text(package_readme(v, project()), encoding="utf-8")
    collect_licenses(app)
    if WINDOWS:
        check_bundled_dlls(app)
    smoke_test(app, v, a.selftest)

    made = [portable(app, out, v)]
    if not a.no_installer:
        made.append(installer_windows(app, out, v) if WINDOWS else installer_linux(app, out, v))
        if not WINDOWS:
            trial_install_linux(made[-1], v)
    sums = out / f"SHA256SUMS-{PLATFORM}.txt"
    sums.write_text("".join(f"{sha256(p)}  {p.name}\n" for p in made), encoding="utf-8")
    shutil.rmtree(work, ignore_errors=True)
    print("\nbuilt:")
    for p in made + [sums]:
        print(f"  {p.name}  ({p.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
