import { useStore } from "@nanostores/react";
import { $showNpvDynamicBg } from "../../../utils/stores.ts";
import { matches, Row, SectionTitle, Toggle } from "./components.tsx";

const SECTION_NAME = "Background";

interface Props {
  query: string;
  sectionFilter: string;
}

export default function BackgroundSection({ query, sectionFilter }: Props) {
  const showNpvDynamicBg = useStore($showNpvDynamicBg);

  if (sectionFilter !== "All" && sectionFilter !== SECTION_NAME) return null;

  const r2 = matches(query, "Display Dynamic Background in Now Playing View", "Show the animated background in the Now Playing panel.");
  if (!r2) return null;

  return (
    <>
      <SectionTitle>Background</SectionTitle>
      <Row
        label="Display Dynamic Background in Now Playing View"
        description="Show the animated background in the Now Playing panel."
      >
        <Toggle checked={showNpvDynamicBg} onChange={(v) => $showNpvDynamicBg.set(v)} />
      </Row>
    </>
  );
}
