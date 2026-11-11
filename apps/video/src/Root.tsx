import "./setup";
import { Composition } from "remotion";
import { DURATION, Onboarding } from "./Onboarding";

export const RemotionRoot = () => (
  <Composition id="Onboarding" component={Onboarding} durationInFrames={DURATION} fps={30} width={1280} height={720} />
);
