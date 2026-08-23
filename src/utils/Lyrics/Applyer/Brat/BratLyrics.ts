import { PageContainer } from "../../../../components/Pages/PageView.ts";
import GetProgress from "../../../Gets/GetProgress.ts";
import {
  $bratBgColor,
  $bratFgColor,
  $bratPalette,
  $lyricsContainerExists,
} from "../../../stores.ts";
import { ClearScrollSimplebar } from "../../../Scrolling/Simplebar/ScrollSimplebar.ts";
import { ConvertTime } from "../../ConvertTime.ts";
import { ClearLyricsPageContainer } from "../../fetchLyrics.ts";
import { ClearLyricsContentArrays, setRomanizedStatus } from "../../lyrics.ts";
import { DestroyAllLyricsContainers } from "../CreateLyricsContainer.ts";
import { EmitApply, EmitNotApplyed } from "../OnApply.ts";

const FONT_B64 = "__BRAT_FONT_B64__";

const MARGIN_RATIO = 20 / 500;
const BLUR_RATIO_OF_WIDTH = 2 / 500;
const MIN_BLUR_PX = 1.2;
const MIN_FONT_PX = 6;

type BratWord = { text: string; start: number; end: number };
type BratLine = { start: number; end: number; words: BratWord[] };
type Mounted = {
  host: HTMLElement;
  stage: HTMLElement;
  text: HTMLElement;
  lines: BratLine[];
  synced: boolean;
};

let mounted: Mounted | null = null;
let raf = 0;
let resizeObserver: ResizeObserver | null = null;
let needsFit = true;
let lastKey = "";

const splitWords = (text: string): string[] =>
  String(text ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);

const pickText = (o: { Text?: string; TransliteratedText?: string }, romanized: boolean): string =>
  romanized && o.TransliteratedText !== undefined ? o.TransliteratedText : (o.Text ?? "");

function fromSyllable(data: any, romanized: boolean): BratLine[] {
  const lines: BratLine[] = [];
  for (const item of data?.Content ?? []) {
    if (item?.Type !== "Vocal") continue;
    const syllables = item.Lead?.Syllables ?? [];
    const words: BratWord[] = [];
    let cur: BratWord | null = null;
    let prevContinues = false;
    for (const s of syllables) {
      if (!s || typeof s.Text !== "string") continue;
      const piece = pickText(s, romanized);
      if (cur && prevContinues) {
        cur.text += piece;
        cur.end = ConvertTime(s.EndTime);
      } else {
        if (cur) words.push(cur);
        cur = {
          text: piece,
          start: ConvertTime(s.StartTime),
          end: ConvertTime(s.EndTime),
        };
      }
      prevContinues = !!s.IsPartOfWord;
    }
    if (cur) words.push(cur);
    const kept = words
      .map(w => ({ ...w, text: w.text.trim().toLowerCase() }))
      .filter(w => w.text.length > 0);
    if (!kept.length) continue;
    lines.push({
      start: ConvertTime(item.Lead?.StartTime ?? item.StartTime ?? 0) || kept[0].start,
      end: ConvertTime(item.Lead?.EndTime ?? item.EndTime ?? 0) || kept[kept.length - 1].end,
      words: kept,
    });
  }
  return lines;
}

function fromLine(data: any, romanized: boolean): BratLine[] {
  const lines: BratLine[] = [];
  for (const ln of data?.Content ?? []) {
    const words = splitWords(pickText(ln, romanized));
    if (!words.length) continue;
    const start = ConvertTime(ln.StartTime ?? 0);
    const end = ConvertTime(ln.EndTime ?? 0);
    const step = Math.max(400, end - start) / words.length;
    lines.push({
      start,
      end,
      words: words.map((text, i) => ({
        text,
        start: start + i * step,
        end: start + (i + 1) * step,
      })),
    });
  }
  return lines;
}

function fromStatic(data: any, romanized: boolean): BratLine[] {
  const words: BratWord[] = [];
  for (const ln of data?.Lines ?? []) {
    for (const text of splitWords(pickText(ln, romanized))) {
      words.push({ text, start: 0, end: 0 });
    }
  }
  return words.length ? [{ start: 0, end: 0, words }] : [];
}

function pickSynced(lines: BratLine[], pos: number): string[] {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].start <= pos) idx = i;
    else break;
  }
  if (idx < 0) return [];
  const cur = lines[idx];
  const shown = cur.words.filter(w => w.start <= pos);
  return (shown.length ? shown : [cur.words[0]]).map(w => w.text);
}

function pickUnsynced(words: BratWord[], pos: number): string[] {
  if (!words.length) return [];
  const n = (Math.floor((pos / 1000) * 1.5) % words.length) + 1;
  return words.slice(Math.max(0, n - 10), n).map(w => w.text);
}

const CLASSIC_BG = "#ffffff";
const CLASSIC_FG = "#000000";

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

const readableOn = (bg: string): string => (luminance(bg) > 0.45 ? "#000000" : "#ffffff");

function setPalette(m: Mounted, bg: string, fg: string): void {
  const page = m.stage.closest<HTMLElement>("#BratLyricsPage");
  for (const el of [page, m.stage]) {
    if (!el) continue;
    el.style.setProperty("--brat-bg", bg);
    el.style.setProperty("--brat-fg", fg);
  }
}

function artworkUrl(): string | null {
  const item: any = Spicetify?.Player?.data?.item ?? {};
  const imgs: any[] = item.images ?? item.album?.images ?? item.show?.images ?? [];
  if (imgs.length) {
    const pick =
      imgs.find(i => i.label === "xlarge") ??
      imgs.find(i => i.label === "large") ??
      imgs[imgs.length - 1];
    if (pick?.url) return toHttps(pick.url);
  }
  const md = item.metadata ?? {};
  for (const k of ["image_xlarge_url", "image_large_url", "image_url", "image_small_url"]) {
    if (md[k]) return toHttps(md[k]);
  }
  return null;
}

function toHttps(u: string): string {
  return u.startsWith("spotify:image:")
    ? "https://i.scdn.co/image/" + u.slice("spotify:image:".length)
    : u;
}

async function coverColorFromArtwork(): Promise<string | null> {
  try {
    const url = artworkUrl();
    if (!url) {
      console.warn("[brat] cover palette: no artwork url on the current item");
      return null;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>(res => {
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = url;
    });
    if (!loaded) return null;

    const N = 48;
    const c = document.createElement("canvas");
    c.width = c.height = N;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, N, N);
    const d = ctx.getImageData(0, 0, N, N).data;

    const buckets = new Map<number, { n: number; r: number; g: number; b: number; sat: number }>();
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx < 28 || mn > 235) continue;
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat: 0 };
      e.n++; e.r += r; e.g += g; e.b += b; e.sat += sat;
      buckets.set(key, e);
    }
    if (!buckets.size) return null;

    let best: { n: number; r: number; g: number; b: number; sat: number } | null = null;
    let bestScore = -1;
    for (const e of buckets.values()) {
      const score = e.n * Math.pow(e.sat / e.n + 0.12, 2);
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (!best) return null;
    const hex = (v: number) => Math.round(v / best!.n).toString(16).padStart(2, "0");
    return "#" + hex(best.r) + hex(best.g) + hex(best.b);
  } catch {
    return null;
  }
}

async function applyPalette(m: Mounted): Promise<void> {
  const mode = $bratPalette.get();
  if (mode === "custom") {
    setPalette(m, $bratBgColor.get(), $bratFgColor.get());
    return;
  }
  if (mode === "cover") {
    let bg: string | null = null;
    try {
      const uri = Spicetify?.Player?.data?.item?.uri;
      if (uri && typeof (Spicetify as any).colorExtractor === "function") {
        const c: any = await (Spicetify as any).colorExtractor(uri);
        bg = c?.VIBRANT || c?.PROMINENT || c?.LIGHT_VIBRANT || c?.DESATURATED || null;
      }
    } catch {
      bg = null;
    }
    if (bg) {
      const m2 = /^#?([0-9a-f]{6})$/i.exec(bg);
      if (m2) {
        const v = parseInt(m2[1], 16);
        const rr = (v >> 16) & 255, gg = (v >> 8) & 255, bb = v & 255;
        const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
        if (mx === 0 || (mx - mn) / mx < 0.25) bg = null;
      }
    }
    if (!bg) bg = await coverColorFromArtwork();
    if (!bg) console.warn("[brat] cover palette: could not derive a colour");
    if (!bg || mounted !== m || $bratPalette.get() !== "cover") {
      if (!bg) setPalette(m, CLASSIC_BG, CLASSIC_FG);
      return;
    }
    setPalette(m, bg, readableOn(bg));
    return;
  }
  setPalette(m, CLASSIC_BG, CLASSIC_FG);
}

let paletteWatching = false;

function watchPalette(): void {
  if (paletteWatching) return;
  paletteWatching = true;
  for (const store of [$bratPalette, $bratBgColor, $bratFgColor]) {
    store.subscribe(() => {
      if (mounted) void applyPalette(mounted);
    });
  }
}

let fontRequested = false;

function ensureFont(): void {
  if (fontRequested) return;
  fontRequested = true;
  if (FONT_B64.startsWith("__")) return;
  try {
    const bin = atob(FONT_B64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const face = new FontFace("BratNarrow", bytes.buffer as ArrayBuffer);
    document.fonts.add(face);
    face
      .load()
      .then(() => {
        needsFit = true;
      })
      .catch(e => console.error("brat: font failed to load", e));
  } catch (e) {
    console.error("brat: font failed to decode", e);
  }
}

function fit(m: Mounted): void {
  const w = m.stage.clientWidth;
  const h = m.stage.clientHeight;
  if (w <= 0 || h <= 0) return;

  const margin = Math.round(w * MARGIN_RATIO);
  const maxW = Math.max(1, w - 2 * margin);
  const maxH = Math.max(1, h - 2 * margin);

  m.text.style.width = maxW + "px";
  if (!m.text.textContent) return;

  let lo = MIN_FONT_PX;
  let hi = Math.max(MIN_FONT_PX, Math.floor(maxH));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    m.text.style.fontSize = mid + "px";
    if (m.text.scrollHeight <= maxH && m.text.scrollWidth <= maxW) lo = mid;
    else hi = mid - 1;
  }
  m.text.style.fontSize = lo + "px";
  m.stage.style.setProperty(
    "--brat-blur",
    Math.max(MIN_BLUR_PX, w * BLUR_RATIO_OF_WIDTH).toFixed(2) + "px"
  );
}

function tick(): void {
  raf = requestAnimationFrame(tick);
  const m = mounted;
  if (!m) return;

  const pos = GetProgress();
  const words = m.synced ? pickSynced(m.lines, pos) : pickUnsynced(m.lines[0]?.words ?? [], pos);

  const key = words.join(" ");
  if (key === lastKey && !needsFit) return;
  if (key !== lastKey) {
    lastKey = key;
    m.text.textContent = words.join(" ");
  }
  needsFit = false;
  fit(m);
}

export function DestroyBratLyrics(): void {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (mounted) {
    mounted.host.classList.remove("BratMode");
    mounted.stage.remove();
    mounted = null;
  }
  lastKey = "";
  needsFit = true;
}

export function ApplyBratLyrics(data: any, useRomanized: boolean = false): void {
  if (!$lyricsContainerExists.get()) return;

  EmitNotApplyed();
  DestroyBratLyrics();
  DestroyAllLyricsContainers();

  const host = PageContainer?.querySelector<HTMLElement>(
    ".LyricsContainer .LyricsContent"
  );
  if (!host) {
    console.error("brat: .LyricsContainer .LyricsContent not found");
    return;
  }

  ClearLyricsContentArrays();
  ClearScrollSimplebar();
  ClearLyricsPageContainer();
  ensureFont();

  const synced = data?.Type === "Syllable" || data?.Type === "Line";
  const lines =
    data?.Type === "Syllable"
      ? fromSyllable(data, useRomanized)
      : data?.Type === "Line"
        ? fromLine(data, useRomanized)
        : fromStatic(data, useRomanized);

  const stage = document.createElement("div");
  stage.className = "BratStage";
  const text = document.createElement("div");
  text.className = "BratText";
  stage.appendChild(text);
  host.appendChild(stage);
  host.classList.add("BratMode");

  mounted = { host, stage, text, lines, synced };
  lastKey = "";
  needsFit = true;

  resizeObserver = new ResizeObserver(() => {
    needsFit = true;
  });
  resizeObserver.observe(stage);

  watchPalette();
  void applyPalette(mounted);

  EmitApply(data?.Type ?? "Static", data?.Content ?? data?.Lines ?? null);
  setRomanizedStatus(useRomanized);

  tick();
}
