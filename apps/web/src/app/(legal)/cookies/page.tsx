import type { Metadata } from "next";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import s from "../legal.module.css";

export const metadata: Metadata = { title: "Cookie Policy" };

// Only what the app needs to work, so there's nothing to opt in or out of and no banner.
export default function Cookies() {
  return (
    <>
      <h1 className="display">Cookie Policy</h1>
      <p className={s.lead}>
        {NAME} uses only the cookies and browser storage it needs to work. No analytics, no ads, no tracking across sites, so
        there&apos;s nothing to accept or refuse.
      </p>

      <h2>Cookies</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>What it&apos;s for</th>
            <th>How long</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>better-auth.session_token</code>
            </td>
            <td>Keeps you signed in.</td>
            <td>7 days, renewed while you use the app; removed when you sign out</td>
          </tr>
          <tr>
            <td>
              <code>better-auth.state</code> and similar
            </td>
            <td>Protects a GitHub or Google sign-in while it happens.</td>
            <td>Minutes</td>
          </tr>
        </tbody>
      </table>
      <p>
        On a secure connection their names start with <code>__Secure-</code>.
      </p>

      <h2>Browser storage</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>What it&apos;s for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>theme</code>
            </td>
            <td>Remembers Day or Night.</td>
          </tr>
          <tr>
            <td>
              <code>todone:saved</code>
            </td>
            <td>A copy of your lists so the app opens offline. Cleared when you sign out.</td>
          </tr>
          <tr>
            <td>
              <code>todone:lists:v1</code>
            </td>
            <td>Lists from before accounts; moved into your account once, then removed.</td>
          </tr>
          <tr>
            <td>
              <code>todone:welcome</code>
            </td>
            <td>Shows the welcome haiku once per sign-in. Gone when you close the tab.</td>
          </tr>
          <tr>
            <td>Service worker cache</td>
            <td>Copies of the app&apos;s pages and code so it opens offline, and reminders you turn on.</td>
          </tr>
        </tbody>
      </table>

      <h2>Controlling them</h2>
      <p>
        You can clear or block these in your browser&apos;s settings. If you block cookies, you can&apos;t sign in. More
        about your data is in the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
