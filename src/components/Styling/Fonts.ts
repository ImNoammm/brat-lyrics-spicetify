import { DeepFreeze } from "../../utils/Addons.ts";

const Fonts = DeepFreeze({
  Lyrics: () => LoadFont("https://fonts.spikerko.org/bratlyrics/source.css"),
  Vazirmatn: () => LoadFont("https://fonts.spikerko.org/Vazirmatn/source.css"),
  NotoSansGeorgian: () => LoadFont("https://fonts.spikerko.org/NotoSansGeorgian/source.css"),
});

export default function LoadFonts() {
  // Iterate over the functions in Fonts and execute each one
  Object.values(Fonts).forEach((loadFontFunction) => {
    loadFontFunction();
  });
}

function LoadFont(url: string) {
  const fontElement = document.createElement("link");
  fontElement.href = url;
  fontElement.rel = "stylesheet";
  fontElement.type = "text/css";
  document.head.appendChild(fontElement);
}

// const ApplyStyles = (element: HTMLElement, properties: Record<string, string>): void => {
//   if (!element || !properties) {
//     throw new Error('SpicyLyrics: ApplyStyles: Element or Properties Missing');
//   }
//   Object.entries(properties).forEach(([property, value]) => {
//     element.style[property as any] = value;
//   });
// };

const GetInlineStyles = (properties: Record<string, string>): string => {
  return Object.entries(properties)
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
};

let isFontPixelApplied = false;
export const ApplyFontPixel = (): HTMLSpanElement | undefined => {
  if (isFontPixelApplied) return;
  const fontPixel = document.createElement("span");
  const styleProperties = {
    width: "1px",
    height: "1px",
    position: "absolute",
    top: "0",
    left: "0",
    opacity: "0",
    "pointer-events": "none",
    "user-select": "none",
    "z-index": "-1",
  };
  const inlineStyles = GetInlineStyles(styleProperties);
  fontPixel.style.cssText = inlineStyles;
  fontPixel.classList.add("BratLyricsFontPixel");
  const fontPixelString = `Aაا"1١`;
  fontPixel.innerHTML = `
<span style="font-weight: 900; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 800; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 700; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 600; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 500; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 400; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 300; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 200; ${inlineStyles}">${fontPixelString}</span>
<span style="font-weight: 100; ${inlineStyles}">${fontPixelString}</span>`.trim();
  document.body.appendChild(fontPixel);
  isFontPixelApplied = true;
  return fontPixel;
};
