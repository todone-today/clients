"use client";

// A fresh sign-in, marked by the sign-in page and read once by the app: it then asks for colours (and, on a first
// visit, runs the training) instead of opening Sort.
const KEY = "todone:welcome";

export function greet() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
}

// Read once per page load, then the same answer (React may run the caller twice).
let seen: boolean | undefined;
export function justSignedIn() {
  if (seen === undefined)
    try {
      seen = !!sessionStorage.getItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch {
      seen = false;
    }
  return seen;
}
