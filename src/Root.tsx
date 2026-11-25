import { Composition } from "remotion";
import { Flyover } from "./flyover/Flyover";
import { REVIEW_DURATION } from "./flyover/reviewPath";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Model review: orbit every side, then the true-north face and low roof */}
      <Composition
        id="GraffitiMillFlyover"
        component={Flyover}
        durationInFrames={REVIEW_DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ mode: "review" as const }}
      />
      {/* The original 15 s cinematic flyover, kept for later */}
      <Composition
        id="GraffitiMillCinematic"
        component={Flyover}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ mode: "cinematic" as const }}
      />
      {/* Fixed review camera for checking the model from any side */}
      <Composition
        id="ModelCheck"
        component={Flyover}
        durationInFrames={2}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ checkAngle: 135 }}
      />
    </>
  );
};
