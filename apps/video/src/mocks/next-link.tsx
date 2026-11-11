// next/link outside Next.js: a plain link (nothing navigates in the video).
import type { AnchorHTMLAttributes } from "react";
export default function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={typeof href === "string" ? href : "#"} {...rest} />;
}
