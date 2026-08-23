#!/usr/bin/env python3
import base64, configparser, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist", "bratlyrics.js")
OUT = os.path.join(HERE, "dist", "bratlyrics.bundled.js")
FONT = os.path.join(HERE, "assets", "arial_narrow-webfont.woff")
BUN = shutil.which("bun") or os.path.expanduser("~/.local/bin/bun")

CONFIG_DIR = os.path.expanduser("~/.config/spicetify")
EXT_DIR = os.path.join(CONFIG_DIR, "Extensions")
INI = os.path.join(CONFIG_DIR, "config-xpui.ini")
SPICETIFY = shutil.which("spicetify") or os.path.expanduser("~/.spicetify/spicetify")
NAME = "bratlyrics.js"
PLACEHOLDER = "__BRAT_FONT_B64__"

def build():
    env = dict(os.environ, SPICETIFY_BIN=SPICETIFY)
    subprocess.run([BUN, "run", "build", "--no-copy"], cwd=HERE, check=True, env=env)
    with open(DIST) as f:
        js = f.read()
    if PLACEHOLDER not in js:
        sys.exit("built bundle has no %s placeholder" % PLACEHOLDER)
    with open(FONT, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    with open(OUT, "w") as f:
        f.write(js.replace(PLACEHOLDER, b64))
    print("built %s (%.1f KB, font %.1f KB inlined)"
          % (OUT, os.path.getsize(OUT) / 1024, len(b64) / 1024))

def register():
    cp = configparser.ConfigParser()
    cp.optionxform = str
    cp.read(INI)
    cur = [e for e in cp["AdditionalOptions"].get("extensions", "").split("|") if e]
    for old in ("brat-lyrics.js", "spicy-lyrics-brat.js", "spicy-lyrics.js"):
        cur = [e for e in cur if e != old]
    if NAME not in cur:
        cur.append(NAME)
    cp["AdditionalOptions"]["extensions"] = "|".join(cur)
    with open(INI, "w") as f:
        cp.write(f, space_around_delimiters=True)
    print("extensions = %s" % "|".join(cur))

def install():
    os.makedirs(EXT_DIR, exist_ok=True)
    shutil.copy2(OUT, os.path.join(EXT_DIR, NAME))
    for old in ("brat-lyrics.js", "spicy-lyrics-brat.js", "spicy-lyrics.js"):
        stale = os.path.join(EXT_DIR, old)
        if os.path.exists(stale):
            os.remove(stale)
            print("removed superseded %s" % stale)
    print("installed -> %s" % os.path.join(EXT_DIR, NAME))
    register()
    subprocess.run([SPICETIFY, "apply"], check=True)

if __name__ == "__main__":
    build()
    if "--install" in sys.argv:
        install()
