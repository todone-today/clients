"use client";

import { useState } from "react";

// Someone's picture (Gravatar, or GitHub/Google's), falling back to their initial when there is none: Gravatar
// answers 404 for emails it doesn't know.
export function Avatar({ image, name, className }: { image?: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={className} aria-hidden>
      {image && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatars from any host; nothing to optimise
        <img src={image} alt="" onError={() => setBroken(true)} referrerPolicy="no-referrer" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
