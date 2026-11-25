import "./setup";
import { Composition } from "remotion";
import { DURATION, Onboarding } from "./Onboarding";
import { Board, SCALE, field } from "./live";
import { setTheme } from "./setup";
import type { EditName } from "./seed";

// The landing page's screenshots of the board (apps/web/public/landing/board-2611.jpg and board-mobile-2611.jpg: save under a new name each time, so caches fetch it): the sample
// account after the tour's first scenes, in the day theme. Render with `npm run video:board`.
const MADE: EditName[] = ["added", "today", "high", "weekly", "step", "idea"];
const Desk = () => {
  setTheme("day");
  return <Board pre={MADE} steps={[{ at: 0, click: field("button[aria-label='Show stickers']") }]} w={1280 / SCALE} h={720 / SCALE} scale={SCALE} />;
};
const Phone = () => {
  setTheme("day");
  return <Board pre={MADE} w={390} h={760} scale={1} />;
};

export const RemotionRoot = () => (
  <>
    <Composition id="Onboarding" component={Onboarding} durationInFrames={DURATION} fps={30} width={1280} height={720} />
    <Composition id="Board" component={Desk} durationInFrames={1} fps={30} width={1280} height={720} />
    <Composition id="BoardPhone" component={Phone} durationInFrames={1} fps={30} width={390} height={760} />
  </>
);
