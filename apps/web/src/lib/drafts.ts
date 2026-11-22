// Half-written things (a note, a goal, a reward) kept for this tab, so closing by accident (a tap outside, Esc)
// loses nothing: opening it again picks up where you were. Cleared once it's saved.
const PREFIX = "todone:draft:";
export function draft<T>(key: string): T | undefined {
  try {
    const v = sessionStorage.getItem(PREFIX + key);
    return v ? (JSON.parse(v) as T) : undefined;
  } catch {
    return undefined;
  }
}
export function keepDraft(key: string, value: unknown) {
  try {
    if (value === undefined || value === "") sessionStorage.removeItem(PREFIX + key);
    else sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}
export const dropDraft = (key: string) => keepDraft(key, undefined);
