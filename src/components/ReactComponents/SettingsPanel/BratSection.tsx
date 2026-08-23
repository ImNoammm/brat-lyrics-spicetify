import { useStore } from "@nanostores/react";
import { $bratBgColor, $bratFgColor, $bratPalette } from "../../../utils/stores.ts";
import { ColorInput, matches, Row, SectionTitle, Select } from "./components.tsx";

const SECTION_NAME = "brat";
const paletteOptions = ["classic", "custom", "cover"];
const paletteLabels = ["Classic (black on white)", "Custom colours", "Match the cover"];

interface Props {
  query: string;
  sectionFilter: string;
}

export default function BratSection({ query, sectionFilter }: Props) {
  const palette = useStore($bratPalette);
  const bg = useStore($bratBgColor);
  const fg = useStore($bratFgColor);

  if (sectionFilter !== "All" && sectionFilter !== SECTION_NAME) return null;

  const r1 = matches(query, "Palette", "Colours for the brat frame. Classic is the white cover variant; Match the Cover pulls them from the current track's artwork.");
  const custom = palette === "custom";
  const r2 = custom && matches(query, "Background Colour", "The brat field colour.");
  const r3 = custom && matches(query, "Text Colour", "The lyrics colour.");

  if (!r1 && !r2 && !r3) return null;

  return (
    <>
      <SectionTitle>brat</SectionTitle>

      {r1 && (
        <Row
          label="Palette"
          description="Colours for the brat frame. Classic is the white cover variant; Match the Cover pulls them from the current track's artwork."
        >
          <Select
            value={palette}
            options={paletteOptions}
            labels={paletteLabels}
            onChange={(v) => $bratPalette.set(v)}
          />
        </Row>
      )}

      {r2 && (
        <Row label="Background Colour" description="The brat field colour.">
          <ColorInput value={bg} onChange={(v) => $bratBgColor.set(v)} />
        </Row>
      )}

      {r3 && (
        <Row label="Text Colour" description="The lyrics colour.">
          <ColorInput value={fg} onChange={(v) => $bratFgColor.set(v)} />
        </Row>
      )}
    </>
  );
}
