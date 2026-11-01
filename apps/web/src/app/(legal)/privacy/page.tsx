import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, NAME, OPERATOR } from "@/lib/brand";
import s from "../legal.module.css";

export const metadata: Metadata = { title: "Privacy Policy" };

// Also the notice India's Digital Personal Data Protection Act, 2023 asks for: what we collect, why,
// people's rights, and whom to complain to.
export default function Privacy() {
  return (
    <>
      <h1 className="display">Privacy Policy</h1>
      <p className={s.lead}>
        {NAME} is a todo app. We collect what it needs to keep your lists, nothing to sell and nothing for ads. This policy
        covers the hosted app; if you run {NAME} on your own server, you hold the data and this policy doesn&apos;t apply.
      </p>

      <h2>Who we are</h2>
      <p>
        The hosted {NAME} service is run by {OPERATOR}, an individual in India, who is the &ldquo;Data Fiduciary&rdquo; under
        India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act). For anything about your data, write to{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>What we collect, and why</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Your name, email and password (stored only as a salted hash)</td>
            <td>To make your account and sign you in.</td>
          </tr>
          <tr>
            <td>Your GitHub or Google account ID, name, email and picture, if you sign in with them</td>
            <td>To sign you in without a password.</td>
          </tr>
          <tr>
            <td>Your lists, tasks, ideas, teams, invitations and settings</td>
            <td>This is the app: to store them and show them to you and the teams you share them with.</td>
          </tr>
          <tr>
            <td>The IP address and browser of each signed-in session</td>
            <td>To keep you signed in and keep accounts secure.</td>
          </tr>
          <tr>
            <td>Tokens for services you connect (Google Calendar, Notion, a Discord webhook)</td>
            <td>To sync with those services, only when you turn it on.</td>
          </tr>
          <tr>
            <td>A push address for each device where you turn on reminders</td>
            <td>To send the reminders you asked for.</td>
          </tr>
          <tr>
            <td>Feedback you send, with the page you sent it from and your browser</td>
            <td>To fix bugs and improve the app.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We don&apos;t use analytics, advertising or tracking. We don&apos;t sell or rent your data, and we don&apos;t use it
        to train AI models.
      </p>

      <h2>Consent</h2>
      <p>
        We process your data on the basis of the consent you give when you make an account, and for the specific purposes
        above. You can withdraw consent at any time by deleting your account (Account → Delete account), which stops all
        processing. Withdrawing doesn&apos;t affect what was done before.
      </p>

      <h2>Who else handles it</h2>
      <p>We use these providers to run the service. They process data for us and only as needed:</p>
      <ul>
        <li>Vercel, which hosts the app.</li>
        <li>Neon, which hosts the database.</li>
        <li>GitHub and Google, if you sign in with them or connect Google Calendar.</li>
        <li>Notion and Discord, if you connect them.</li>
        <li>Your browser&apos;s push service (Apple, Google or Mozilla), for reminders you turn on.</li>
      </ul>
      <p>
        These providers may store data outside India. We only use providers that protect it, and we don&apos;t transfer it to
        any country the Government of India has restricted. Teammates see the lists and members of the teams you share. We
        disclose data to authorities only when the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete it or your account. Deleting a task, list or team removes it; deleting your account removes your
        account, personal lists, settings, sessions, connected-service tokens, push addresses and feedback straight away,
        along with any team where you&apos;re the only member. Copies can stay in our database provider&apos;s backups for up
        to 30 days before they roll off.
      </p>

      <h2>Your rights</h2>
      <p>Under the DPDP Act you can:</p>
      <ul>
        <li>
          <b>Get a copy</b> of your data: Account → Export everything (JSON or CSV), or write to us for a summary of what we
          hold and whom we&apos;ve shared it with.
        </li>
        <li>
          <b>Correct or update</b> it: edit your lists and name in the app, or write to us.
        </li>
        <li>
          <b>Erase</b> it: delete it in the app, or Account → Delete account.
        </li>
        <li>
          <b>Nominate</b> someone to exercise these rights for you if you die or can&apos;t act, by writing to us.
        </li>
        <li>
          <b>Complain</b> to us, and if you&apos;re not satisfied, to the Data Protection Board of India.
        </li>
      </ul>
      <p>
        Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from your account&apos;s email. We reply within 30 days.
      </p>

      <h2>Grievances</h2>
      <p>
        Our grievance contact is {OPERATOR}, <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We acknowledge complaints within 7
        days and resolve them within 30 days. You must contact us before going to the Data Protection Board.
      </p>

      <h2>Children</h2>
      <p>
        {NAME} is for people 18 and over. We don&apos;t knowingly collect data from children; if you think a child has made
        an account, write to us and we&apos;ll delete it.
      </p>

      <h2>Security</h2>
      <p>
        Connections are encrypted, passwords are hashed, and access is limited to what each account and team may see. If a
        breach affects your data, we&apos;ll tell you and the Data Protection Board as the law requires.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies and browser storage the app needs to work. See the <Link href="/cookies">Cookie Policy</Link>
        .
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date below, and tell you in the app or by email before a significant
        change takes effect.
      </p>
    </>
  );
}
