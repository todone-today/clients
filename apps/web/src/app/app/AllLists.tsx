"use client";

import { Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { type List, tick, todayISO, waiting } from "@todone/sdk/tasks";
import { label } from "@todone/sdk/calendar";
import { ListIcon, listColor } from "./listIcon";
import s from "./app.module.css";

// Every list at once: a sticker per list with its open tasks, to tick off or open where they live.
export function AllLists({
  lists,
  update,
  onOpen,
}: {
  lists: List[];
  update: (id: string, f: (l: List) => List | null) => void;
  onOpen: (listId: string, task?: string) => void;
}) {
  const today = todayISO();
  const me = authClient.useSession().data?.user.id;
  // Counted like the sidebar: steps too, repeats waiting for their day not yet.
  const left = (l: List) => l.tasks.flatMap((t) => [t, ...t.sub]).filter((t) => !t.done && !waiting(t, today)).length;
  const open = lists.reduce((n, l) => n + left(l), 0);
  return (
    <div className={s.allLists}>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>All lists</h1>
        <p className={s.progress}>
          {open} open across {lists.length} list{lists.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className={s.allGrid}>
        {lists.map((l) => {
          const tasks = l.tasks.filter((t) => !t.done);
          return (
            <li key={l.id} className={s.allCard} style={{ "--fill": listColor(l.id) } as React.CSSProperties}>
              <button className={s.allName} onClick={() => onOpen(l.id)}>
                <ListIcon id={l.id} name={l.name} icon={l.icon} /> {l.name}
                <span>{left(l)}</span>
              </button>
              {tasks.length ? (
                <ul>
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <button
                        className={s.check}
                        role="checkbox"
                        aria-checked={false}
                        aria-label={t.title}
                        disabled={waiting(t, today)}
                        title={waiting(t, today) ? "Repeats: tick it on its day" : undefined}
                        onClick={() => update(l.id, (x) => ({ ...x, tasks: tick(x.tasks, t.id, today, me) }))}
                      >
                        {t.done && <Check size={12} strokeWidth={3.5} />}
                      </button>
                      <button className={s.allTask} onClick={() => onOpen(l.id, t.id)}>
                        {t.title}
                        {(t.due || t.sub.length > 0) && (
                          <small data-late={!!t.due && t.due < today}>
                            {[
                              t.due && label(t.due, { month: "short", day: "numeric" }),
                              t.sub.length && `${t.sub.filter((x) => x.done).length}/${t.sub.length} steps`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.allDone}>All done.</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
