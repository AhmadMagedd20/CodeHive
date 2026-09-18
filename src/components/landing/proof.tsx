import Image from "next/image";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, StaggerItem } from "./motion";
import { Glow } from "./backdrop";

/*
 * ⚠️ PLACEHOLDER QUOTES — the names are real students; the quote text below is
 * sample copy awaiting their real words. Replace each `quote` string when the
 * real testimonials arrive. To add a photo, drop an image in
 * `public/testimonials/` and set `photo: "/testimonials/<file>.jpg"`.
 */
type Testimonial = {
  name: string;
  detail: string;
  quote: string;
  accent: "moss" | "clay" | "amber" | "fern" | "mist";
  photo?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Lina Amr",
    detail: "Databases · GUC",
    quote:
      "I bombed the first quiz, then rewatched the joins lecture until it actually made sense. Got 9/10 on the next one. Being able to replay the exact five minutes I didn't get is what saved me.",
    accent: "fern",
  },
  {
    name: "Marwan Khaled",
    detail: "Intro to Programming · GUC",
    quote:
      "The lab walkthrough was basically the same flow as our lab test. I sat down, typed it like I'd done it before — because I had. Finished early for the first time ever.",
    accent: "amber",
  },
  {
    name: "Abdullah Ehab",
    detail: "Databases · GIU",
    quote:
      "Megz's feedback on my submission told me the exact line that was wrong and why. Fixed it, resubmitted, passed the same night. No autograder does that.",
    accent: "clay",
  },
  {
    name: "Abderahman Yassin",
    detail: "Data Structures · GUC",
    quote:
      "The locked lectures annoyed me at first — then I realized I'd kept up all semester without trying. Exam week was the calmest I've ever had.",
    accent: "moss",
  },
  {
    name: "Abderahman Hawary",
    detail: "Intro to Programming · GUC",
    quote:
      "Every solved problem walks through the thinking, not just the answer. That's the part no slides ever gave me — and it's why it finally clicked.",
    accent: "mist",
  },
];

const AVATAR_ACCENT: Record<Testimonial["accent"], string> = {
  moss: "bg-flame text-white",
  clay: "bg-sunny text-ink",
  amber: "bg-lilac text-ink",
  fern: "bg-mint text-ink",
  mist: "bg-sky text-ink",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

function Avatar({ t }: { t: Testimonial }) {
  if (t.photo) {
    return (
      <Image
        src={t.photo}
        alt={t.name}
        width={56}
        height={64}
        className="h-16 w-14 rounded-2xl object-cover shadow-soft"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-16 w-14 items-end justify-center rounded-2xl pb-2 font-display text-lg font-extrabold tracking-display shadow-soft",
        AVATAR_ACCENT[t.accent],
      )}
    >
      {initials(t.name)}
    </span>
  );
}

const STATS = [
  { value: "4", label: "years teaching" },
  { value: "200+", label: "students helped" },
  { value: "MET, GUC '22", label: "taught by a grad who sat your exams" },
];

export function Proof() {
  return (
    <section id="about" className="relative scroll-mt-20 overflow-hidden bg-lilac-soft px-4 py-24 sm:px-6">
      <Glow className="-right-16 -top-10 h-72 w-72 bg-white" />
      <Glow className="-left-16 bottom-0 h-72 w-72 bg-lilac/30" />

      <div className="relative mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-eyebrow uppercase text-ink/70">
            Proof, not promises
          </p>
          <h2 className="mt-3 font-display text-section text-ink">
            This already works. Ask them.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/85">
            I&apos;m Megz — MET graduate from GUC. For 4 years I&apos;ve taught the stuff that
            actually shows up in exams and interviews, and over 200 students have come out the
            other side calmer than they went in. The portal is that teaching, always available.
          </p>
        </Reveal>

        {/* track record chips */}
        <Stagger className="mx-auto mt-10 flex max-w-3xl flex-wrap items-stretch justify-center gap-4">
          {STATS.map((s) => (
            <StaggerItem
              key={s.label}
              className="flex min-w-[10rem] flex-1 flex-col items-center justify-center rounded-2xl border-brutal border-ink bg-white px-5 py-5 text-center backdrop-blur-sm"
            >
              <span className="font-display text-subsection text-ink">
                {s.value}
              </span>
              <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink/70">
                {s.label}
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        {/* testimonials */}
        <Stagger className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name} className={cn(t.name === TESTIMONIALS[0].name && "sm:col-span-2 lg:col-span-1")}>
              <figure className="flex h-full flex-col rounded-2xl border-brutal border-ink bg-white p-6 shadow-soft">
                <Quote aria-hidden className="h-5 w-5 text-flame/40" />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/85">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                  <Avatar t={t} />
                  <span>
                    <span className="block font-display text-sm font-extrabold tracking-display text-ink">
                      {t.name}
                    </span>
                    <span className="block text-xs text-ink/55">{t.detail}</span>
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
