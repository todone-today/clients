import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { Invite } from "./Invite";
import { headline, kindLine, shared } from "./data";
import s from "./goal.module.css";

// A goal shared by link: its owner's progress, live, and (in a challenge) everyone's who joined. Not indexed: it's
// for the people the link was sent to. The preview image in chats is opengraph-image.tsx.
export async function generateMetadata({ params }: PageProps<"/g/[slug]">): Promise<Metadata> {
  const g = await shared((await params).slug);
  if (!g) return { title: "Shared goal", robots: { index: false, follow: false } };
  const h = headline(g.snapshot);
  const title = `${g.owner.name}: ${g.snapshot.title}`;
  const description =
    g.mode === "challenge"
      ? `${g.owner.name} is doing this and wants company. ${h.big} ${h.label} so far. Join in on todone.`
      : `${h.big} ${h.label}. ${g.owner.name} is doing it with todone.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image" }, robots: { index: false, follow: false } };
}

export default function SharedGoal({ params }: PageProps<"/g/[slug]">) {
  return (
    <Suspense>
      <Goal params={params} />
    </Suspense>
  );
}

async function Goal({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const g = await shared(slug);
  if (!g) notFound();
  const snap = g.snapshot;
  const h = headline(snap);
  const challenge = g.mode === "challenge";
  return (
    <main className={s.page}>
      <Link href="/" className={s.mark} aria-label="todone">
        <Logo size={28} />
      </Link>
      <article className={s.card} data-reached={snap.reached || undefined}>
        <p className={s.who}>
          <Avatar className={s.avatar} image={g.owner.image} name={g.owner.name} />
          <span>
            <b>{g.owner.name}</b> {snap.reached ? "reached this goal" : challenge ? "is doing this, and wants company" : "is working on"}
          </span>
        </p>
        <h1 className="display">{snap.title}</h1>
        <p className={s.kind}>{kindLine(snap)}</p>
        <div className={s.big}>
          <b className="display">{h.big}</b>
          <span>{h.label}</span>
        </div>
        <span className={s.bar} aria-hidden>
          <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, h.frac))})` }} />
        </span>
        {/* The last 8 weeks: a square each, filled when something was done that week. */}
        <ol className={s.weeks} aria-label="The last 8 weeks">
          {snap.weeks.map((n, i) => (
            <li key={i} data-on={n > 0 || undefined} title={`${n} that week`} />
          ))}
        </ol>
        {snap.reward && (
          <p className={s.reward}>
            Working towards a treat: <b>{snap.reward}</b>
          </p>
        )}
      </article>

      {challenge && (
        <section className={s.people} aria-labelledby="people-h">
          <h2 id="people-h">
            In it together · {g.people.length + 1} of 6
          </h2>
          <ol>
            {[{ name: g.owner.name, image: g.owner.image, snapshot: snap }, ...g.people].map((p, i) => (
              <li key={i}>
                <Avatar className={s.avatar} image={p.image} name={p.name} />
                <b>{p.name}</b>
                <span>{p.snapshot.thisWeek ?? 0} this week</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Invite slug={slug} challenge={challenge} full={challenge && g.spots === 0} owner={g.owner.name} />
      <p className={s.fine}>
        todone is a to-do app with goals and rewards. Private: your own lists are end-to-end encrypted.{" "}
        <Link href="/">What&apos;s todone?</Link>
      </p>
    </main>
  );
}
