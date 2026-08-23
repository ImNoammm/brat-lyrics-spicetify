import { useStore } from "@nanostores/react";
import {
  $disableNpvLyrics,
  $hideNpvLyricsWhenUnavailable,
  $popupLyricsAllowed,
} from "../../../utils/stores.ts";
import { matches, Row, SectionTitle, Toggle } from "./components.tsx";

const SECTION_NAME = "Interface";

interface Props {
  query: string;
  sectionFilter: string;
}

export default function InterfaceSection({ query, sectionFilter }: Props) {
  const popupLyricsAllowed = useStore($popupLyricsAllowed);
  const hideNpvLyricsWhenUnavailable = useStore($hideNpvLyricsWhenUnavailable);
  const disableNpvLyrics = useStore($disableNpvLyrics);

  if (sectionFilter !== "All" && sectionFilter !== SECTION_NAME) return null;

  const r3 = matches(query, "Disable Popup Lyrics Window", "Prevent lyrics from opening in a floating popup window.");
  const r6 = matches(query, "Hide NPV Lyrics When No Lyrics Are Available", "Remove the lyrics card from the Now Playing sidebar while the current song has no lyrics, instead of showing a notice. It comes back on the next song that has them.");
  const r7 = matches(query, "Disable NPV Lyrics", "Never show the lyrics card in the Now Playing sidebar.");

  if (!r3 && !r6 && !r7) return null;

  return (
    <>
      <SectionTitle>Interface</SectionTitle>

      {r3 && (
        <Row label="Disable Popup Lyrics Window" description="Prevent lyrics from opening in a floating popup window.">
          <Toggle
            checked={!popupLyricsAllowed}
            onChange={(v) => $popupLyricsAllowed.set(!v)}
          />
        </Row>
      )}

      {r7 && (
        <Row
          label="Disable NPV Lyrics"
          description="Never show the lyrics card in the Now Playing sidebar."
        >
          <Toggle checked={disableNpvLyrics} onChange={(v) => $disableNpvLyrics.set(v)} />
        </Row>
      )}

      {r6 && (
        <Row
          label="Hide NPV Lyrics When No Lyrics Are Available"
          description="Remove the lyrics card from the Now Playing sidebar while the current song has no lyrics, instead of showing a notice. It comes back on the next song that has them."
          disabled={disableNpvLyrics}
          disabledReason="The NPV lyrics card is disabled"
        >
          <Toggle
            checked={hideNpvLyricsWhenUnavailable}
            onChange={(v) => $hideNpvLyricsWhenUnavailable.set(v)}
          />
        </Row>
      )}
    </>
  );
}
