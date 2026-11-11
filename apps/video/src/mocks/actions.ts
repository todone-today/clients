// The app's server actions, for the video: the real module, except that "load my lists" answers with the video's
// sample lists (src/seed.ts). The store is put in its in-memory mode first, so edits stay in the page.
import { seed } from "../seed";
import { startDemo } from "../../../web/src/lib/store";

export * from "../../../web/src/app/app/actions";

// How many times the app has loaded its lists: a scene waits for the load after it mounts before acting.
let loads = 0;
export const loaded = () => loads;
export const fetchLists = async () => {
  const lists = seed();
  startDemo(lists);
  loads++;
  return lists;
};
