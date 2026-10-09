import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";

const base = process.env.REVIEW_BASE_PATH || "/";
export const repository = "https://github.com/yusifmmdv/Mekan-AI";
export const asset = (src: string) => src.startsWith("/") ? `${base}${src.slice(1)}` : src;

// Static review builds reuse product components, with explicit links to the
// implemented full application rather than unsupported backend actions.
export default function ReviewLink({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const examples = href.startsWith("/examples");
  const target = examples ? "#examples" : href === "/" ? "#main" : href.startsWith("/") ? "#demo-notes" : href;
  return <a {...props} href={target} onClick={event => {
    onClick?.(event);
    if (examples) {
      const sample = new URL(href, "https://review.local").searchParams.get("space");
      if (sample) window.dispatchEvent(new CustomEvent("mekan-sample", { detail: sample }));
    }
  }} />;
}

export function ReviewImage({ src, priority, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string; priority?: boolean }) {
  void priority;
  // eslint-disable-next-line @next/next/no-img-element -- Static deployment has no Next image server.
  return <img {...props} alt={alt} src={asset(src)} />;
}

export function useRouter(): never {
  throw new Error("Server-backed navigation is not available in the public review build.");
}
