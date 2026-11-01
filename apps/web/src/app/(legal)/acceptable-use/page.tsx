import type { Metadata } from "next";
import { CONTACT, NAME } from "@/lib/brand";
import s from "../legal.module.css";

export const metadata: Metadata = { title: "Acceptable Use Policy" };

export default function AcceptableUse() {
  return (
    <>
      <h1 className="display">Acceptable Use Policy</h1>
      <p className={s.lead}>{NAME} is for organising your work and life. Please don&apos;t use it to:</p>
      <ul>
        <li>Break the law, or help anyone else break it.</li>
        <li>Store or share content that exploits children, incites violence, or harasses, threatens or doxxes anyone.</li>
        <li>Infringe someone else&apos;s copyright, trademark, privacy or other rights.</li>
        <li>Send spam, including mass team invitations to people who didn&apos;t ask for them.</li>
        <li>Spread malware, or use calendar links, sync links or webhooks to attack or overload other services.</li>
        <li>
          Try to get into accounts, teams or data that aren&apos;t yours, or probe, scan or test {NAME}&apos;s security
          without our written permission.
        </li>
        <li>Overload the service, for example with automated requests far beyond normal use.</li>
        <li>Resell or rebrand the hosted service. (The code is open source: run your own copy instead.)</li>
      </ul>

      <h2>What happens if you do</h2>
      <p>
        We may remove the content, suspend or close the account, and report illegal activity to the authorities. Where we
        can, we&apos;ll tell you first and give you a chance to fix it.
      </p>

      <h2>Reporting</h2>
      <p>
        To report abuse or a security problem, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Please report security
        issues privately and give us time to fix them before telling anyone else.
      </p>
    </>
  );
}
