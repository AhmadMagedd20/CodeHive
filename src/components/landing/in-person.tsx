import { MapPin } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { whatsappLink, WHATSAPP_MESSAGES } from "@/lib/whatsapp";
import { Reveal } from "./motion";
import { Glow } from "./backdrop";

/**
 * "In-person classes" — the route for students who want the live sessions
 * rather than (or alongside) the portal.
 *
 * Placed between How It Works and the final CTA: by this point a visitor has
 * seen what the portal is and how buying works, so "or come in person" reads
 * as a genuine alternative rather than an interruption to the pitch.
 *
 * The copy states the portal is FREE for in-person students, on the
 * instructor's instruction (2026-09-21).
 *
 * ⚠️ The pricing code does not currently agree: `IN_PERSON_DISCOUNT_PERCENT`
 * in `lib/money.ts` is 40, so an in-person account is charged 60% of the list
 * price at checkout, not zero. The instructor asked for the copy change only
 * and explicitly said to leave the payment logic alone, so this is a known and
 * deliberate gap, not an oversight. If a student ever reaches checkout, the
 * page will contradict this section.
 *
 * Renders nothing when NEXT_PUBLIC_WHATSAPP_NUMBER is unset: the entire point
 * of the section is the button, so a version without it would be a dead end.
 */
export function InPersonClasses() {
  const href = whatsappLink(WHATSAPP_MESSAGES.inPerson);
  if (!href) return null;

  return (
    <section
      id="in-person"
      className="relative scroll-mt-20 overflow-hidden bg-mint-soft px-4 py-24 sm:px-6"
    >
      <Glow className="-left-20 top-0 h-72 w-72 bg-white" />
      <Glow className="-right-16 bottom-0 h-72 w-72 bg-mint/30" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal className="flex flex-col items-center rounded-card border-brutal border-ink bg-white px-6 py-12 text-center shadow-soft sm:px-12">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint shadow-soft">
            <MapPin className="h-5 w-5 text-ink" />
          </span>

          <h2 className="mt-5 font-display text-section text-ink">
            Want to take classes with Megz in person?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
            Join the live sessions at GUC and GIU — and the portal comes{" "}
            <span className="font-semibold text-ink">free with your seat</span>. Every lecture,
            solved problem and lab walkthrough, yours to rewatch. Message me to find out about
            upcoming groups.
          </p>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "mt-8 inline-flex w-full items-center justify-center gap-2.5 sm:w-auto",
              "rounded-full border-brutal border-ink bg-[#25D366] px-7 py-3.5",
              "font-semibold text-white shadow-soft",
              "outline-none focus-visible:ring-4 focus-visible:ring-ink/25",
              "transition-transform duration-200 motion-safe:hover:scale-[1.03] motion-safe:active:scale-95",
            ].join(" ")}
          >
            <WhatsAppIcon className="h-5 w-5" />
            Message Megz on WhatsApp
          </a>

          <p className="mt-4 text-sm text-ink/55">
            Opens WhatsApp — no account needed.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
