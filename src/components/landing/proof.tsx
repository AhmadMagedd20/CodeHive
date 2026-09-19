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
    name: "Abdullah Ehab",
    detail: "Data Structures & Algorithms · GUC",
    quote:
      "Ahmed Maged definitely made getting an A- in CS3 a lot easier. He explains CS3 in a way that actually makes sense, and you can tell he genuinely cares about whether you understand or not. He can explain multiple concepts without making things confusing or making you forget what you learned before. He just makes CS3 way easier to understand.",
    accent: "fern",
  },
  {
    name: "Mariam Ashraf",
    detail: "Data Structures & Algorithms · GIU",
    quote:
      "megz is incredibly clever and has a real talent for breaking down difficult concepts into simple steps. He always took the time to go at a pace that worked for me and was extremely patient and supportive throughout. Thanks to his guidance, I was able to retake data structures and get a B- . I highly recommend him.",
    accent: "amber",
  },
  {
    name: "Leena Ashraf",
    detail: "Data Structures & Algorithms · GUC",
    quote:
      "You have been a great help throughout the CS3 course. You explain everything very clearly and always make sure that I fully understand each concept before moving on while solving several examples. You are always patient when explaining things.",
    accent: "clay",
  },
  {
    name: "Jana Mohamed",
    detail: "Data Structures & Algorithms · GUC",
    quote:
      "I just wanted to say thank you so much for all your effort throughout the course the way you explained everything made the material much easier for me to understand and your guidance really helped me improve, pass the course and get a better grade than I expected I really appreciate everything you did❤️",
    accent: "moss",
  },
  {
    name: "Omar ElShabrawy",
    detail: "Data Structures & Algorithms · GUC",
    quote:
      "I’m really grateful for all the time and effort you put into CS3. You always made sure we actually understood what we were doing instead of just memorizing things, and that made a huge difference for me. Your explanations and advice helped me feel much more confident with the course and definitely made the whole experience easier. Thank you for being such a great instructor and for everything you’ve done for us ❤️",
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
  { value: "MET, GUC '25", label: "taught by a grad who sat your exams" },
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
