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
        {NAME} is a todo app. We collect what it needs to keep your lists,
        nothing to sell and nothing for ads. This policy covers the hosted app;
        if you run {NAME} on your own server, you hold the data and this policy
        doesn&apos;t apply.
      </p>

      <h2>Who we are</h2>
      <p>
        The hosted {NAME} service is run by {OPERATOR}, an individual in India,
        who is the &ldquo;Data Fiduciary&rdquo; under India&apos;s Digital
        Personal Data Protection Act, 2023 (DPDP Act). For anything about your
        data, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
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
            <td>
              Your name and email. Your password never reaches us: your browser
              sends only a one-way hash derived from it, which we hash again
            </td>
            <td>To make your account and sign you in.</td>
          </tr>
          <tr>
            <td>
              Your lists, tasks, ideas, goals, rewards and XP,{" "}
              <b>end-to-end encrypted</b>: we store them scrambled and
              can&apos;t read them. Lists you switch off encryption for (to use
              integrations) are stored readable. Files you attach to a task are
              encrypted on your device the same way.
            </td>
            <td>
              This is the app: to store them and show them to you and the teams
              you share them with.
            </td>
          </tr>
          <tr>
            <td>
              Your encryption keys, locked by your password and by your recovery
              key, and your public key (so teammates can share a team&apos;s key
              with you)
            </td>
            <td>
              So you can open your lists on any device. We can&apos;t unlock
              them.
            </td>
          </tr>
          <tr>
            <td>
              If you switch on reminders: each browser&apos;s push address
              (from Google, Mozilla, Apple or Microsoft, depending on the
              browser) and the coming week&apos;s reminders,{" "}
              <b>sealed on your device</b> so only that browser can read them.
              We see when each is due, not what it says. Each is deleted once
              sent.
            </td>
            <td>
              To send reminders when todone is closed. Switching reminders off
              deletes them.
            </td>
          </tr>
          <tr>
            <td>
              A task you share by link, <b>stored readable</b>: its details, the
              comments on it and the files added to it, by you or by anyone with
              the link. Guests show up by the name they choose, or as
              &ldquo;Anonymous&rdquo;: we keep that name and a random number
              their browser makes, never an account or email. Their IP address
              is used briefly to limit abuse.
            </td>
            <td>
              So people without an account can see the task, comment and add
              files. Stop sharing and it&apos;s all deleted from our server; the
              conversation goes back into your task, encrypted.
            </td>
          </tr>
          <tr>
            <td>Your teams, invitations and settings</td>
            <td>To run teams and the features you turn on.</td>
          </tr>
          <tr>
            <td>The IP address and browser of each signed-in session</td>
            <td>To keep you signed in and keep accounts secure.</td>
          </tr>
          <tr>
            <td>
              Tokens for services you connect (Google Calendar, Notion, a
              Discord webhook)
            </td>
            <td>To sync with those services, only when you turn it on.</td>
          </tr>
          <tr>
            <td>
              Feedback you send, with the page you sent it from and your browser
            </td>
            <td>To fix bugs and improve the app.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We don&apos;t use analytics, advertising or tracking. We don&apos;t sell
        or rent your data, and we don&apos;t use it to train AI models.
      </p>

      <h2>Consent</h2>
      <p>
        We process your data on the basis of the consent you give when you make
        an account, and for the specific purposes above. You can withdraw
        consent at any time by deleting your account (Account → Delete account),
        which stops all processing. Withdrawing doesn&apos;t affect what was
        done before.
      </p>

      <h2 id="still-see">What we can see, even with encryption</h2>
      <p>Your lists are scrambled on your device, so we can&apos;t read them. A few things we still see, because the
        service needs them to work:</p>
      <ul>
        <li>Your name and email, and which teams you&apos;re in.</li>
        <li>How many lists you have, roughly how big they are, and when they change. Not what&apos;s in them.</li>
        <li>
          Lists you choose to put in your calendar link (for Google Calendar, Apple Calendar or Outlook). These are stored
          readable so your calendar can fetch them, and each list says so.
        </li>
        <li>A task you share by link, with its comments and files, until you stop sharing it.</li>
        <li>When a reminder is due. Never what it says.</li>
        <li>
          What you type or say to Ask todone, while it&apos;s being turned into suggestions (below). Not your lists.
        </li>
      </ul>

      <h2 id="ai">Ask todone (AI)</h2>
      <p>
        Ask todone is optional. When you use it, what you type, or your recording, is sent to be understood, along with
        the names of your lists, goals and rewards (so suggestions land in the right place) and today&apos;s date. Nothing
        else from your lists goes with it.
      </p>
      <ul>
        <li>
          A recording goes to todone&apos;s own transcriber, a computer we run, which turns it into words. The recording is
          deleted as soon as that&apos;s done.
        </li>
        <li>
          The words go to Google&apos;s Gemini API (paid tier, which Google doesn&apos;t use to improve its products), and
          the suggestions come back to your browser.
        </li>
        <li>
          If you ask it to work with a list you already have (clean it up, sort it, reschedule it), todone asks you
          first. Only if you agree does a readable copy of that list&apos;s tasks go along, for that conversation; your
          other lists stay end-to-end encrypted.
        </li>
        <li>
          Your browser shows them to you first. Only what you choose is added, encrypted on your device like everything
          else.
        </li>
        <li>
          The words and suggestions are deleted within an hour, reviewed or not. We count your requests and the tokens
          they use each month, for your plan&apos;s AI credits.
        </li>
      </ul>

      <h2>Who else handles it</h2>
      <p>
        We use these providers to run the service. They process data for us and
        only as needed:
      </p>
      <ul>
        <li>Vercel, which hosts the website.</li>
        <li>Contabo, which hosts our server and database.</li>
        <li>
          Cloudflare, which stores encrypted backups of the database (only we
          hold the key) and files attached to tasks (encrypted on your device,
          except on a task you share by link).
        </li>
        <li>
          Sentry, which receives error reports so we can fix bugs. They describe
          what broke in the code, not you: no email, IP address, list contents
          or page addresses. Stored in the EU.
        </li>
        <li>
          Resend, which sends our emails (confirming your address, resetting
          your password).
        </li>
        <li>
          Gravatar (Automattic), for profile pictures: your browser asks it for
          the picture matching a scrambled (hashed) form of your email. If you
          have no Gravatar, you see your initial.
        </li>
        <li>
          Razorpay, if you pay for a plan: they get your name, email, phone and
          payment details and handle the payment. We get back only the amount,
          date and status, never your card or bank details, and keep a record of
          each payment for tax law. Your lists never go anywhere near billing.
        </li>
        <li>
          Google, GitHub or Discord, if you sign in with them: they confirm who you are and share your name, email and
          picture. They never see your lists, which stay locked with your unlock passphrase. Google again if you connect
          Google Calendar.
        </li>
        <li>
          Google (the Gemini API), if you use Ask todone: what you typed or said, and your list, goal and reward names.
          See <a href="#ai">Ask todone</a>.
        </li>
        <li>Notion and Discord, if you connect them.</li>
      </ul>
      <p>
        These providers may store data outside India. We only use providers that
        protect it, and we don&apos;t transfer it to any country the Government
        of India has restricted. Teammates see the lists and members of the
        teams you share. We disclose data to authorities only when the law
        requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete it or your account. Accounts whose email isn&apos;t
        confirmed within 7 days of signing up are deleted, with everything in
        them. Deleting a task, list or team removes it; deleting your account
        removes your account, personal lists, settings, sessions,
        connected-service tokens, keys and feedback straight away, along with
        any team where you&apos;re the only member. Records of payments (amount,
        date, plan, email) are kept for as long as tax law requires. Copies can stay in our
        database provider&apos;s backups for up to 30 days before they roll off.
      </p>

      <h2>Your rights</h2>
      <p>Under the DPDP Act you can:</p>
      <ul>
        <li>
          <b>Get a copy</b> of your data: Account → Export everything (JSON or
          CSV), or write to us for a summary of what we hold and whom we&apos;ve
          shared it with.
        </li>
        <li>
          <b>Correct or update</b> it: edit your lists and name in the app, or
          write to us.
        </li>
        <li>
          <b>Erase</b> it: delete it in the app, or Account → Delete account.
        </li>
        <li>
          <b>Nominate</b> someone to exercise these rights for you if you die or
          can&apos;t act, by writing to us.
        </li>
        <li>
          <b>Complain</b> to us, and if you&apos;re not satisfied, to the Data
          Protection Board of India.
        </li>
      </ul>
      <p>
        Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from your
        account&apos;s email. We reply within 30 days.
      </p>

      <h2>Grievances</h2>
      <p>
        Our grievance contact is {OPERATOR},{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We acknowledge complaints
        within 7 days and resolve them within 30 days. You must contact us
        before going to the Data Protection Board.
      </p>

      <h2>Children</h2>
      <p>
        {NAME} is for people 18 and over. We don&apos;t knowingly collect data
        from children; if you think a child has made an account, write to us and
        we&apos;ll delete it.
      </p>

      <h2>Security</h2>
      <p>
        Your lists are end-to-end encrypted in your browser (AES-256), with a
        key that only your password or recovery key can open; we never receive
        either. Connections are encrypted too, and access is limited to what
        each account and team may see. This also means we can&apos;t recover
        your lists if you lose both your password and your recovery key. If a
        breach affects your data, we&apos;ll tell you and the Data Protection
        Board as the law requires.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies and browser storage the app needs to work. See
        the <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date below, and tell you
        in the app or by email before a significant change takes effect.
      </p>
    </>
  );
}
