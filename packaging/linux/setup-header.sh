#!/bin/sh
# vcode2bar @VERSION@ - installer for Linux (x86-64)
#
#   sh vcode2bar-@VERSION@-linux-x64-setup.sh [options]
#
#   --yes                 answer yes to every question (unattended install)
#   --prefix DIR          install under DIR (default: ~/.local, or /usr/local when run as root)
#   --no-prerequisites    don't check or install the ZBar library
#   --prerequisites-only  only check and install the ZBar library, then stop
#   --uninstall           remove an installed vcode2bar (from the same prefix)
#   --help                show this help
#
# The program files are appended to this script (a tar.gz after the __PAYLOAD_BELOW__ line).
set -eu

APP=vcode2bar
VERSION="@VERSION@"
YES=0; PREREQ=1; PREREQ_ONLY=0; UNINSTALL=0; PREFIX=""

say() { printf '%s\n' "$*"; }
die() { printf 'vcode2bar setup: %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
    case "$1" in
        --yes|-y) YES=1 ;;
        --prefix) shift; [ $# -gt 0 ] || die "--prefix needs a directory"; PREFIX="$1" ;;
        --prefix=*) PREFIX="${1#--prefix=}" ;;
        --no-prerequisites) PREREQ=0 ;;
        --prerequisites-only) PREREQ_ONLY=1 ;;
        --uninstall) UNINSTALL=1 ;;
        --help|-h) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) die "unknown option: $1 (see --help)" ;;
    esac
    shift
done

if [ -z "$PREFIX" ]; then
    if [ "$(id -u)" = 0 ]; then PREFIX=/usr/local; else PREFIX="$HOME/.local"; fi
fi
LIBDIR="$PREFIX/share/$APP"
BINDIR="$PREFIX/bin"
APPSDIR="$PREFIX/share/applications"
ICONDIR="$PREFIX/share/icons/hicolor/256x256/apps"

ask() {   # ask "question" -> 0 for yes
    [ "$YES" = 1 ] && return 0
    [ -t 0 ] || return 1                        # no terminal to answer from: treat as "no"
    printf '%s [Y/n] ' "$1"
    read -r answer || return 1
    case "$answer" in ""|y|Y|yes|Yes|YES) return 0 ;; *) return 1 ;; esac
}

as_root() {
    if [ "$(id -u)" = 0 ]; then "$@"
    elif command -v sudo >/dev/null 2>&1; then sudo "$@"
    else die "installing the package needs root rights: run '$*' as root"; fi
}

# ---------------------------------------------------------------- uninstall
if [ "$UNINSTALL" = 1 ]; then
    [ -d "$LIBDIR" ] || die "vcode2bar is not installed under $PREFIX"
    rm -f "$BINDIR/$APP" "$APPSDIR/$APP.desktop" "$ICONDIR/$APP.png"
    rm -rf "$LIBDIR"
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPSDIR" >/dev/null 2>&1 || true
    say "vcode2bar was removed from $PREFIX. Your settings (~/.config/vcode2bar) were kept."
    exit 0
fi

# ---------------------------------------------------------------- prerequisites
have_lib() {   # have_lib libzbar.so.0
    if command -v ldconfig >/dev/null 2>&1 && ldconfig -p 2>/dev/null | grep -q "$(echo "$1" | sed 's/\./\\./g')"; then return 0; fi
    for d in /usr/lib /usr/lib64 /usr/lib/x86_64-linux-gnu /usr/local/lib; do
        ls "$d/$1"* >/dev/null 2>&1 && return 0
    done
    return 1
}
have_zbar() { have_lib libzbar.so.0; }

package_manager() {
    for pm in apt-get dnf zypper pacman; do
        command -v "$pm" >/dev/null 2>&1 && { echo "$pm"; return 0; }
    done
}

zbar_install_text() {   # what will be run, for the question
    case "$1" in
        apt-get) echo "apt-get install libzbar0t64 (libzbar0 on older systems)" ;;
        dnf) echo "dnf install zbar-libs" ;;
        zypper) echo "zypper install libzbar0" ;;
        pacman) echo "pacman -S zbar" ;;
    esac
}

install_zbar() {
    case "$1" in
        apt-get)
            as_root apt-get update -qq || true          # a fresh system may have no package lists yet
            if apt-cache show libzbar0t64 >/dev/null 2>&1; then pkg=libzbar0t64; else pkg=libzbar0; fi
            as_root apt-get install -y "$pkg" ;;
        dnf) as_root dnf install -y zbar-libs ;;
        zypper) as_root zypper --non-interactive install libzbar0 ;;
        pacman) as_root pacman -S --noconfirm --needed zbar ;;
    esac
}

if [ "$PREREQ" = 1 ]; then
    if have_zbar; then
        say "Prerequisite: ZBar library ............ found"
    else
        say "Prerequisite: ZBar library ............ MISSING"
        say "  vcode2bar needs it to read barcodes from photos, scans and PDFs and for the read-back"
        say "  check. Everything else works without it."
        pm=$(package_manager || true)
        if [ -z "$pm" ]; then
            say "  No supported package manager found: install ZBar (libzbar.so.0) with your system's tools."
        elif ask "  Install it now with: $(zbar_install_text "$pm") ?"; then
            install_zbar "$pm" || say "  Installing ZBar failed; vcode2bar still works, without image reading."
            have_zbar && say "  ZBar installed."
        else
            say "  Skipped. You can install it later with: $(zbar_install_text "$pm")"
        fi
    fi
    if ! have_lib libX11.so.6; then
        say "Note: no X11 libraries found - the window (GUI) needs a desktop; the command line works without."
    fi
fi
[ "$PREREQ_ONLY" = 1 ] && exit 0

# ---------------------------------------------------------------- install
say "Installing vcode2bar $VERSION to $LIBDIR"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/vcode2bar-setup.XXXXXX")
trap 'rm -rf "$TMP"' EXIT INT TERM
LINE=$(awk '/^__PAYLOAD_BELOW__$/ { print NR + 1; exit 0 }' "$0")
tail -n +"$LINE" "$0" | tar -xzf - -C "$TMP" || die "the installer is damaged (payload could not be unpacked)"
[ -x "$TMP/$APP/$APP" ] || die "the installer is damaged ($APP missing in the payload)"

mkdir -p "$PREFIX/share" "$BINDIR" "$APPSDIR" "$ICONDIR"
rm -rf "$LIBDIR"                        # replace an earlier version of the program files
cp -R "$TMP/$APP" "$LIBDIR"
ln -sf "$LIBDIR/$APP" "$BINDIR/$APP"
cp "$LIBDIR/vcode2bar.png" "$ICONDIR/$APP.png"
cat > "$APPSDIR/$APP.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=vcode2bar
GenericName=Bank barcode tool
Comment=Finnish virtual barcode to bank barcode, and back
Exec=$LIBDIR/$APP %f
Icon=$APP
Terminal=false
Categories=Office;Finance;
Keywords=barcode;virtuaaliviivakoodi;pankkiviivakoodi;invoice;
EOF
cp "$0" "$LIBDIR/setup.sh" 2>/dev/null || true      # keeps --uninstall available
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPSDIR" >/dev/null 2>&1 || true

"$LIBDIR/$APP" --version >/dev/null 2>&1 || die "the installed program does not start ($LIBDIR/$APP --version)"
say "vcode2bar $VERSION installed."
say "  Start it from the application menu, or run: $APP   (the command line: $APP --help)"
case ":$PATH:" in *":$BINDIR:"*) ;; *) say "  Note: $BINDIR is not on your PATH; add it, or run $BINDIR/$APP" ;; esac
say "  Remove it with: sh $LIBDIR/setup.sh --uninstall$( [ "$PREFIX" = "$HOME/.local" ] || [ "$PREFIX" = /usr/local ] || printf ' --prefix %s' "$PREFIX")"
exit 0
__PAYLOAD_BELOW__
