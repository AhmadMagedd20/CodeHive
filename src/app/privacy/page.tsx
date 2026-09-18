import { LegalPage, Section, Todo } from "@/components/legal-page";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="19 September 2026">
      <Section n={1} title="Who controls your data">
        <p>
          Cohort Portal is operated by <Todo>your full legal or trading name</Todo>, who decides how
          your personal data is used. For anything in this policy — including a request to see or
          delete your data — contact <Todo>privacy/support email address</Todo>.
        </p>
      </Section>

      <Section n={2} title="What we collect">
        <p>We deliberately keep this short. We hold:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Account details</strong> — username, email address, university (GUC or GIU), and
            optionally your full name if you provide one.
          </li>
          <li>
            <strong>Your password, as an argon2id hash.</strong> We never store it in a readable
            form and cannot tell you what it is.
          </li>
          <li>
            <strong>Learning activity</strong> — which lessons you have opened, how far through a
            video you are, quiz attempts, assignment submissions, and the written feedback given on
            them.
          </li>
          <li>
            <strong>Payment records</strong> — what you bought, the amount charged, whether a
            discount applied, and the screenshot you uploaded as proof of transfer.
          </li>
          <li>
            <strong>Security records</strong> — sign-in attempts (successful and failed), the IP
            address and browser user-agent attached to a session, and account changes such as
            suspension. These exist so we can investigate account sharing and unauthorised access.
          </li>
        </ul>
        <p>
          We do not use advertising trackers, we do not sell your data, and we do not build profiles
          for marketing.
        </p>
      </Section>

      <Section n={3} title="Payment screenshots — what happens to them">
        <p>
          This is the most sensitive thing you send us, so it gets its own section.
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            The screenshot is uploaded to private cloud file storage. The storage area is{" "}
            <strong>not public</strong> — files are reachable only through short-lived links
            generated for a signed-in reviewer.
          </li>
          <li>
            It is viewed by the instructor for one purpose: confirming your transfer matches the
            amount due.
          </li>
          <li>
            We store the image as you sent it. <strong>Before uploading, crop or hide anything you
            do not need to show</strong> — full account numbers, balances, or unrelated
            transactions. We only need the amount, the date and the recipient.
          </li>
          <li>
            We keep it as a record of the transaction for{" "}
            <Todo>
              retention period — check what Egyptian tax/accounting rules require for payment
              records before choosing
            </Todo>
            , then delete it.
          </li>
        </ul>
      </Section>

      <Section n={4} title="Why we are allowed to hold it">
        <p>
          To provide the service you signed up for and to take payment for it (performance of a
          contract); to keep accounts secure and investigate misuse (our legitimate interest in
          protecting paid content); and to meet record-keeping obligations for money received (legal
          obligation). We do not rely on consent for any of the above, so withdrawing consent is not
          the mechanism for deleting your account — just ask us.
        </p>
      </Section>

      <Section n={5} title="Who else can see it">
        <p>We share data only with the services that run the platform:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong>Supabase</strong> — database and file storage (your account, progress, and
            payment screenshots).
          </li>
          <li>
            <strong>Vercel</strong> — application hosting; processes requests and keeps short-lived
            server logs.
          </li>
          <li>
            <strong>Resend</strong> — sends account emails (verification, password reset, purchase
            confirmations). Receives your email address and the message.
          </li>
          <li>
            <strong>Bunny Stream</strong> — hosts and delivers lecture video. Receives the technical
            request data any video host does, such as your IP address.
          </li>
          <li>
            <strong>Telegram</strong> — sends the instructor a notification when someone registers
            or submits a payment. This includes your username and email.
          </li>
        </ul>
        <p>
          These providers process data on our instructions. Some operate outside Egypt, so your data
          may be stored or processed abroad. <Todo>
            If you need to name specific regions or add transfer safeguards, confirm with a lawyer.
          </Todo>
        </p>
        <p>We do not sell your data or pass it to advertisers.</p>
      </Section>

      <Section n={6} title="Content protection and monitoring">
        <p>
          Paid lectures are delivered through time-limited links, and your account is limited to one
          active sign-in at a time. We record sign-in activity to detect account sharing.
        </p>
        <p>
          To be straightforward about it: we do <strong>not</strong> embed your name or email into
          video playback, and we do not track you across other websites. What we look at is
          sign-in patterns on your own account.
        </p>
      </Section>

      <Section n={7} title="How long we keep things">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Account and learning records: while your account is open.</li>
          <li>
            Payment records and screenshots: <Todo>retention period, per tax rules</Todo>.
          </li>
          <li>
            Security and sign-in logs: <Todo>retention period, e.g. 12 months</Todo>.
          </li>
          <li>
            After you ask us to delete your account we remove your personal data, except records we
            are legally required to keep (principally payment records).
          </li>
        </ul>
      </Section>

      <Section n={8} title="Your rights">
        <p>
          You can ask us to show you the data we hold about you, correct anything wrong, delete your
          account, or send you a copy of your data. You can change your password yourself from your
          account page. Email <Todo>privacy/support email address</Todo> and we will respond within{" "}
          <Todo>response time</Todo>.
        </p>
        <p>
          <Todo>
            If you have users covered by GDPR or another regime, this section needs the specific
            rights and complaint routes that apply. Confirm which laws you are subject to.
          </Todo>
        </p>
      </Section>

      <Section n={9} title="Cookies">
        <p>
          We set one cookie: a session cookie that keeps you signed in. It is http-only, sent only
          over HTTPS in production, and expires after a period of inactivity. There are no
          analytics or advertising cookies.
        </p>
      </Section>

      <Section n={10} title="Children">
        <p>
          The platform is intended for university students.{" "}
          <Todo>
            State a minimum age and how you handle anyone below it, if that is realistic for your
            audience.
          </Todo>
        </p>
      </Section>

      <Section n={11} title="Changes">
        <p>
          If we change how we use your data in a way that affects you, we will email registered
          users. The date at the top always shows the current version.
        </p>
      </Section>
    </LegalPage>
  );
}
