// The sample lists the scenes show, written in the app's own Markdown task format and read with its parser.
import { parse, todayISO, type List, type Task } from "@todone/sdk/tasks";

export const today = todayISO();
const day = (n: number) => {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
// Ids from the titles, so a note keeps its colour (the app picks it by id) from scene to scene.
const stable = (t: Task): Task => ({ ...t, id: `t-${t.title.toLowerCase().replace(/\W+/g, "-")}`, sub: t.sub.map(stable) });
export const tasks = (md: string): Task[] => parse(md).map(stable);
export const list = (name: string, md: string, id = name.toLowerCase().replace(/\W+/g, "-")): List => ({
  id: `list-${id}`,
  name,
  tasks: tasks(md),
  version: 1,
  updated: 0,
});
export { day };
