// The app's server actions, for the video: the real module, except that loading lists answers with the video's
// sample account as the current scene starts (src/seed.ts), and a shared task's link and conversation come from
// here. The store is put in its in-memory mode first, so edits stay in the page.
import type { Comment } from "../../../web/src/components/Thread";
import type { Task } from "@todone/sdk/tasks";
import { type EditName, SHARE, seed } from "../seed";
import { startDemo } from "../../../web/src/lib/store";

export * from "../../../web/src/app/app/actions";

// How many times the app has loaded its lists: a scene waits for the load after it mounts before acting.
let loads = 0;
let edits: readonly EditName[] = [];
export const loaded = () => loads;
// The scene's starting point: the account with these edits made.
export const startFrom = (e: readonly EditName[]) => void (edits = e);
export const fetchLists = async () => {
  const lists = seed(edits);
  startDemo(lists);
  loads++;
  return lists;
};

// ---- A shared task: someone with the link (no account, so "Anonymous") replies until it's done --------------------
const MIN = 60_000;
export const REPLIES = [
  "Found flights on the 14th, ₹4,200 each. Book those?",
  "Booked! Tickets are in your email.",
  "Seats 12A and 12B, window for you. All done ✈️",
];
let shown = 0;
// Set per frame by the video: how many replies have come in.
export const setReplies = (n: number) => void (shown = n);
const comments = (): Comment[] =>
  REPLIES.slice(0, shown).map((body, i) => ({
    id: `c${i}`,
    parent: null,
    who: "Anonymous",
    guest: true,
    mine: false,
    at: Date.now() - (REPLIES.length - i) * 4 * MIN,
    body,
    files: [],
  }));
export const createShare = async (_task: Task) => ({ id: SHARE });
export const shareView = async (_id: string) => ({ token: "k3Jd9xQe", task: { files: [] }, comments: comments() });
export const rotateShare = async (_id: string) => ({ token: "k3Jd9xQe" });
export const revokeShare = async (_id: string) => {};
export const setShareFiles = async () => {};
