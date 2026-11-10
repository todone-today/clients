import type { Metadata } from "next";
import Link from "next/link";
import s from "../../(legal)/legal.module.css";

export const metadata: Metadata = {
  title: "Get todone on your phone",
  description: "Install todone on iPhone, Android or your computer, and turn on reminders.",
};

// No app store needed: todone installs from the browser, works offline, and sends reminders once installed.
export default function Install() {
  return (
    <>
      <h1 className="display">Get todone on your phone.</h1>
      <p className={s.lead}>
        No app store needed. Add todone to your home screen and it opens like an app: full screen, works without signal,
        and can remind you even when it&apos;s closed. It takes about 20 seconds.
      </p>

      <h2 id="iphone">iPhone and iPad</h2>
      <ol>
        <li>
          Open <b>todone.today</b> in <b>Safari</b> and sign in.
        </li>
        <li>
          Tap the <b>Share</b> button (the square with an arrow pointing up), then <b>Add to Home Screen</b>, then{" "}
          <b>Add</b>.
        </li>
        <li>Open todone from the new icon on your home screen. Reminders only work when it&apos;s opened from there.</li>
        <li>
          Tap the <b>bell</b> at the top, turn <b>Reminders</b> on, and tap <b>Allow</b>.
        </li>
      </ol>
      <p>Needs iOS 16.4 or later. In other iPhone browsers the Share button is there too, under the address bar or ⋯.</p>

      <h2 id="android">Android</h2>
      <ol>
        <li>
          Open <b>todone.today/app</b> in <b>Chrome</b> and sign in.
        </li>
        <li>
          Tap <b>Install</b> when todone offers it, or open Chrome&apos;s menu (⋮) and tap <b>Install app</b> (on some
          phones: <b>Add to Home screen</b>).
        </li>
        <li>
          Open todone from its icon, tap the <b>bell</b>, turn <b>Reminders</b> on, and tap <b>Allow</b>.
        </li>
      </ol>
      <p>
        Press and hold the icon for shortcuts: <b>Add a task</b> and <b>Calendar</b>.
      </p>

      <h2 id="computer">Computer</h2>
      <ul>
        <li>
          <b>Chrome or Edge:</b> click the install icon at the right of the address bar, then <b>Install</b>.
        </li>
        <li>
          <b>Safari on a Mac:</b> File → <b>Add to Dock</b>.
        </li>
      </ul>

      <h2 id="reminders">If reminders don&apos;t show up</h2>
      <ul>
        <li>Check that notifications are allowed for todone in your phone&apos;s Settings → Notifications.</li>
        <li>Focus, Do Not Disturb and battery saver can hold them back.</li>
        <li>
          In the bell, <b>Send a test</b> shows straight away whether this device can get them.
        </li>
        <li>
          Reminders are sealed on your device: our server only knows when to send them, never what they say. More in
          the <Link href="/docs#reminders">Guide</Link>.
        </li>
      </ul>
    </>
  );
}
