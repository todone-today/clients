// next/dynamic outside Next.js: nothing in the video's scenes loads lazily, so render nothing.
export default function dynamic() {
  return function Nothing() {
    return null;
  };
}
