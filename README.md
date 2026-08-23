# brat lyrics

<img width="1794" height="839" alt="image" src="https://github.com/user-attachments/assets/0d421164-7107-4b00-9b2d-6991033dc789" />

Spotify lyrics that look like the cover of Charli xcx's *brat* — lowercase Arial Narrow, justified edge to edge, slightly out of focus, one line building up word by word.

I forked [Spicy Lyrics](https://github.com/spikerko/spicy-lyrics) and swapped out the renderer. Everything else is still Spicy's: the fetching, the word-level timing, the sidebar card, fullscreen, PiP.

## Install

You'll need [bun](https://bun.sh) and [spicetify](https://spicetify.app) already working.

```bash
git clone https://github.com/ImNoammm/brat-lyrics-spicetify
cd brat-lyrics-spicetify
bun install
python3 install-brat.py --install
```

That builds the bundle, copies it into `~/.config/spicetify/Extensions/`, adds it to `config-xpui.ini` and runs `spicetify apply`. Restart Spotify after.

Then hit the lyrics button in the playbar, or use the card in the now-playing sidebar.

## Settings

Gear icon, top right of the lyrics view. The one worth knowing about is **Palette**:

- *Match the cover* (default) — takes the background and text colours from the artwork
- *Custom colours* — pick your own
- *Classic* — black on white, like the real cover

Fullscreen is the button next to it. Controls fade out after a couple of seconds if you stop moving the mouse.

## Notes

Works alongside normal Spicy Lyrics if you've got both — separate settings, separate playbar button.

The Arial Narrow file in `assets/` is the same one bratgenerator.com uses, so the type actually matches instead of approximating it.

AGPL-3.0, same as upstream.
