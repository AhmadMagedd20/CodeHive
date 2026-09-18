import { LegalPage, Section, Todo } from "@/components/legal-page";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="19 September 2026">
      <Section n={1} title="Who we are">
        <p>
          Cohort Portal is an online course platform operated by <Todo>your full legal or trading
          name, and business registration number if you have one</Todo>. In these terms,
          &ldquo;we&rdquo; and &ldquo;us&rdquo; means that operator, and &ldquo;you&rdquo; means the
          person using the platform.
        </p>
        <p>
          You can reach us at <Todo>support email address</Todo>. We aim to reply within{" "}
          <Todo>response time, e.g. 2 working days</Todo>.
        </p>
      </Section>

      <Section n={2} title="Your account">
        <p>
          You need an account to access paid course content. You must give an email address you
          actually control, and confirm it before you can sign in. Accounts are personal — they are
          for one named individual and may not be shared, sold, or transferred.
        </p>
        <p>
          You are responsible for keeping your password private and for everything done through your
          account. Tell us promptly if you think someone else has access to it.
        </p>
        <p>
          We may suspend or close an account that breaches these terms — most commonly for sharing
          login details or redistributing course content.
        </p>
      </Section>

      <Section n={3} title="One active session at a time">
        <p>
          Your account can be signed in on <strong>one device at a time</strong>. Signing in
          somewhere new automatically signs you out everywhere else. This is deliberate and it is
          how we keep course access tied to the person who paid for it.
        </p>
        <p>
          You can switch devices as often as you like. What you cannot do is be signed in on two at
          once, which means an account cannot be quietly shared between several people.
        </p>
      </Section>

      <Section n={4} title="Course content and what you may do with it">
        <p>
          When you buy a course you get a personal, non-transferable right to watch, read and use
          that content for your own study, for as long as we keep the platform running. You do not
          own the content and you are not buying a licence to distribute it.
        </p>
        <p>You may not:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>share your login with anyone else;</li>
          <li>
            re-upload, resell, or publicly post lecture videos, worked solutions, problem sets or
            written feedback;
          </li>
          <li>
            present the material as your own teaching, or use it to run a competing course;
          </li>
          <li>
            submit someone else&apos;s work as yours, or pass our solutions off as your own in an
            assessment set by your university.
          </li>
        </ul>
        <p>
          Playback links are time-limited and stop working after a while. Circumventing that, or any
          other access control, is a breach of these terms.
        </p>
        <p className="rounded-2xl border-brutal border-ink bg-white p-4">
          <strong className="font-semibold">Your university&apos;s rules still apply.</strong>{" "}
          Cohort Portal is independent teaching support. It is not affiliated with, endorsed by, or
          provided on behalf of GUC, GIU, or any other institution. Nothing here overrides your
          university&apos;s academic-integrity policy, and you are responsible for following it.
        </p>
      </Section>

      <Section n={5} title="Payment">
        <p>
          Courses — and, where offered, individual weeks — are paid for by bank transfer through
          InstaPay. You send the amount shown at checkout and upload a screenshot of the transfer as
          proof.
        </p>
        <p>
          Access is granted <strong>after we review that screenshot manually</strong>, not
          immediately on upload. Reviews normally happen within{" "}
          <Todo>your realistic review window, e.g. 24 hours</Todo>. If the transfer cannot be
          matched — the amount is wrong, or the screenshot is unreadable — we will reject it and
          tell you why by email.
        </p>
        <p>
          Prices are in Egyptian pounds and shown before you pay. Where a discount applies (a sale,
          or the in-person student rate), the final amount is displayed at checkout. If you have
          already bought individual weeks of a course, what you paid for them is credited against
          the full-course price.
        </p>
      </Section>

      <Section n={6} title="Refunds">
        <p>
          <Todo>
            This section needs your actual policy before you take money. Decide and state: whether
            refunds are available at all; a window (e.g. 14 days from purchase); whether it changes
            once lessons have been watched; how a refund is returned; and how someone requests one.
          </Todo>
        </p>
        <p>
          Whatever you choose, consumer-protection law in your jurisdiction may grant rights you
          cannot contract out of. This is worth asking a lawyer about specifically.
        </p>
      </Section>

      <Section n={7} title="Availability">
        <p>
          We work to keep the platform available but cannot promise uninterrupted service. Content,
          schedules and release dates can change, and lessons may be released gradually over a
          course rather than all at once.
        </p>
        <p>
          If we ever have to shut the platform down, we will give reasonable notice by email so you
          can finish or download what you are entitled to.
        </p>
      </Section>

      <Section n={8} title="Liability">
        <p>
          We provide teaching material and feedback. We do not guarantee any particular exam result,
          grade, or academic outcome — those depend on your own work.
        </p>
        <p>
          <Todo>
            A limitation-of-liability clause belongs here, drafted for your jurisdiction. Do not
            copy one from another site; an unenforceable clause is worse than none.
          </Todo>
        </p>
      </Section>

      <Section n={9} title="Changes to these terms">
        <p>
          We may update these terms. If a change materially affects you we will email registered
          users. Continuing to use the platform after a change means you accept the updated terms.
        </p>
      </Section>

      <Section n={10} title="Governing law">
        <p>
          <Todo>
            State the governing law and which courts have jurisdiction — presumably Egypt, but
            confirm it.
          </Todo>
        </p>
      </Section>
    </LegalPage>
  );
}
