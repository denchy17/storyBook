"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BOOK_TYPES, NARRATOR_VOICES, STORY_QUESTIONS } from "@/lib/book-types";
import { cn } from "@/lib/cn";
import { Button, Field, Input, Textarea } from "./ui";
import { PhotoUpload } from "./photo-upload";
import {
  ArrowRightIcon,
  BookIcon,
  ChevronLeftIcon,
  CheckIcon,
  SparkleIcon,
  VolumeIcon,
} from "./icons";

type Person = {
  name: string;
  age: string;
  gender: string;
  description: string;
};

const emptyPerson: Person = { name: "", age: "", gender: "", description: "" };

const STEPS = ["Type", "Characters", "Story", "Review"];

// Story step sub-steps:
// 0 = basics (title, language, dedication)
// 1…STORY_QUESTIONS.length = one question per screen
// last = narrator voice
const STORY_SUBSTEPS_TOTAL = STORY_QUESTIONS.length + 2;

const QUESTION_ICONS = ["🎁", "💕", "📸", "💫", "🏡"];
const QUESTION_HINTS = [
  "Is it a birthday? A holiday? A just-because?",
  "Their favorite way to spend time together.",
  "A real moment you both remember warmly.",
  "What you hope they carry with them.",
  "Little details that make the story feel like home.",
];

export function CreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [storySubStep, setStorySubStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookTypeId, setBookTypeId] = useState(BOOK_TYPES[0].id);
  const [language, setLanguage] = useState("English");
  const [title, setTitle] = useState("");
  const [dedication, setDedication] = useState("");
  const [voiceId, setVoiceId] = useState(NARRATOR_VOICES[0].id);

  const [child, setChild] = useState<Person>(emptyPerson);
  const [parent, setParent] = useState<Person>(emptyPerson);
  const [childPhoto, setChildPhoto] = useState<File | null>(null);
  const [parentPhoto, setParentPhoto] = useState<File | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const bookType = useMemo(
    () => BOOK_TYPES.find((b) => b.id === bookTypeId) ?? BOOK_TYPES[0],
    [bookTypeId],
  );

  const canProceed = useMemo(() => {
    if (step === 1) return child.name.trim() && parent.name.trim();
    return true;
  }, [step, child.name, parent.name]);

  function handleBack() {
    if (step === 2 && storySubStep > 0) {
      setStorySubStep((s) => s - 1);
    } else {
      setStep((s) => Math.max(0, s - 1));
    }
  }

  function handleContinue() {
    if (step === 2 && storySubStep < STORY_SUBSTEPS_TOTAL - 1) {
      setStorySubStep((s) => s + 1);
    } else {
      setStep((s) => s + 1);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        bookType: bookTypeId,
        language,
        title: title.trim() || undefined,
        dedication: dedication.trim() || undefined,
        styleHint: bookType.styleHint,
        voiceId,
        characters: [
          { role: "child", ...trim(child) },
          { role: "parent", ...trim(parent) },
        ],
        details: STORY_QUESTIONS.map((q) => ({
          question: q,
          answer: answers[q]?.trim() ?? "",
        })).filter((d) => d.answer),
      };

      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      if (childPhoto) form.append("photo_0", childPhoto);
      if (parentPhoto) form.append("photo_1", parentPhoto);

      const res = await fetch("/api/books", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start your book");
        setSubmitting(false);
        return;
      }
      router.push(`/book/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const continueLabel = useMemo(() => {
    if (step !== 2) return "Continue";
    if (storySubStep === 0) return "Let's go";
    if (storySubStep === STORY_SUBSTEPS_TOTAL - 1) return "Continue";
    if (storySubStep === STORY_SUBSTEPS_TOTAL - 2) return "Almost done";
    return "Next";
  }, [step, storySubStep]);

  const isOnFinalStep = step === STEPS.length - 1;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Stepper step={step} />

      <div className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-[0_30px_70px_-50px_rgba(80,70,228,0.3)] sm:p-9">
        {step === 2 && (
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                Story details
              </span>
              <span className="text-xs text-muted">
                {storySubStep + 1} / {STORY_SUBSTEPS_TOTAL}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                style={{
                  width: `${((storySubStep + 1) / STORY_SUBSTEPS_TOTAL) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {step === 0 && (
          <Section
            title="What kind of story is this?"
            subtitle="We'll shape the tone, art style, and pacing around your choice."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {BOOK_TYPES.map((t) => {
                const active = t.id === bookTypeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBookTypeId(t.id)}
                    className={cn(
                      "rounded-2xl border p-5 text-left transition-all",
                      active
                        ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30"
                        : "border-line bg-paper-2/30 hover:border-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-card text-accent">
                        <BookIcon className="h-5 w-5" />
                      </span>
                      {active && (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
                          <CheckIcon className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <p className="mt-4 font-display text-lg font-semibold text-ink">
                      {t.label}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{t.blurb}</p>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section
            title="Who is the story about?"
            subtitle="For this MVP, every book stars a child and their parent. Add a photo of each so their faces stay true and detailed in every illustration."
          >
            <div className="grid gap-8 sm:grid-cols-2">
              <PersonCard
                heading="The child"
                person={child}
                onChange={setChild}
                onPhoto={setChildPhoto}
              />
              <PersonCard
                heading="The parent"
                person={parent}
                onChange={setParent}
                onPhoto={setParentPhoto}
              />
            </div>
          </Section>
        )}

        {step === 2 && (
          <div key={storySubStep} className="animate-fade-up">
            {storySubStep === 0 && (
              <BasicsSubStep
                title={title}
                setTitle={setTitle}
                language={language}
                setLanguage={setLanguage}
                dedication={dedication}
                setDedication={setDedication}
              />
            )}
            {storySubStep >= 1 && storySubStep <= STORY_QUESTIONS.length && (
              <QuestionSubStep
                question={STORY_QUESTIONS[storySubStep - 1]}
                icon={QUESTION_ICONS[storySubStep - 1]}
                hint={QUESTION_HINTS[storySubStep - 1]}
                index={storySubStep - 1}
                total={STORY_QUESTIONS.length}
                value={answers[STORY_QUESTIONS[storySubStep - 1]] ?? ""}
                onChange={(val) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [STORY_QUESTIONS[storySubStep - 1]]: val,
                  }))
                }
                onSkip={() => setStorySubStep((s) => s + 1)}
              />
            )}
            {storySubStep === STORY_SUBSTEPS_TOTAL - 1 && (
              <NarratorSubStep voiceId={voiceId} setVoiceId={setVoiceId} />
            )}
          </div>
        )}

        {step === 3 && (
          <Section
            title="Ready to bring it to life?"
            subtitle="Here's the recipe for your book. Creating it takes a few minutes — you can watch the progress on the next screen."
          >
            <dl className="divide-y divide-line rounded-2xl border border-line bg-paper-2/30">
              <Row label="Type" value={bookType.label} />
              <Row label="Art style" value={bookType.styleHint} />
              <Row
                label="Child"
                value={child.name || "—"}
                extra={childPhoto ? "photo added" : "no photo"}
              />
              <Row
                label="Parent"
                value={parent.name || "—"}
                extra={parentPhoto ? "photo added" : "no photo"}
              />
              <Row label="Language" value={language} />
              <Row
                label="Narrator"
                value={NARRATOR_VOICES.find((v) => v.id === voiceId)?.name ?? "—"}
              />
              <Row label="Pages" value="10 illustrated spreads" />
            </dl>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent-soft/30 p-4">
              <SparkleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm text-ink-soft">
                We generate one anchor illustration first — establishing the art
                style and both faces — then reuse it as a reference so every page
                stays perfectly consistent.
              </p>
            </div>
          </Section>
        )}

        {error && (
          <p className="mt-5 rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0 || submitting}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </Button>

          {!isOnFinalStep ? (
            <Button onClick={handleContinue} disabled={!canProceed}>
              {continueLabel}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting} size="lg">
              <SparkleIcon className="h-5 w-5" />
              Create my book
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function trim(p: Person) {
  return {
    name: p.name.trim(),
    age: p.age.trim() || undefined,
    gender: p.gender.trim() || undefined,
    description: p.description.trim() || undefined,
  };
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-white"
                    : done
                      ? "border-forest bg-forest/10 text-forest"
                      : "border-line bg-card text-muted",
                )}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  active ? "text-ink" : "text-muted",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="h-px w-6 bg-line sm:w-10" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function BasicsSubStep({
  title,
  setTitle,
  language,
  setLanguage,
  dedication,
  setDedication,
}: {
  title: string;
  setTitle: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  dedication: string;
  setDedication: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <span className="text-4xl">📖</span>
        <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-ink">
          First, let&apos;s name your story
        </h3>
        <p className="mt-2 text-sm text-muted">
          All optional — we can suggest a title if you leave it blank.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" hint="Optional">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Night We Flew"
            autoFocus
          />
        </Field>
        <Field label="Language">
          <Input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="English"
          />
        </Field>
      </div>

      <Field label="Dedication" hint="Printed inside the cover">
        <Input
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="For Mia, who is braver than she knows."
        />
      </Field>
    </div>
  );
}

function QuestionSubStep({
  question,
  icon,
  hint,
  index,
  total,
  value,
  onChange,
  onSkip,
}: {
  question: string;
  icon: string;
  hint: string;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index
                ? "w-8 bg-accent"
                : i < index
                  ? "w-4 bg-accent/35"
                  : "w-4 bg-line",
            )}
          />
        ))}
        <span className="ml-auto text-xs tabular-nums text-muted">
          {index + 1} of {total}
        </span>
      </div>

      <div>
        <span className="text-4xl">{icon}</span>
        <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-ink">
          {question}
        </h3>
        <p className="mt-2 text-sm text-muted">{hint}</p>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer…"
        className="min-h-32 text-base"
        autoFocus
      />

      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-muted underline-offset-2 hover:text-ink-soft hover:underline transition-colors"
      >
        Skip this question
      </button>
    </div>
  );
}

function NarratorSubStep({
  voiceId,
  setVoiceId,
}: {
  voiceId: string;
  setVoiceId: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <span className="text-4xl">🎙️</span>
        <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-ink">
          Pick a narrator voice
        </h3>
        <p className="mt-2 text-sm text-muted">
          This voice will bring the story to life for your little one.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {NARRATOR_VOICES.map((v) => {
          const active = v.id === voiceId;
          return (
            <button
              type="button"
              key={v.id}
              onClick={() => setVoiceId(v.id)}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-accent bg-accent-soft/40 ring-2 ring-accent/20"
                  : "border-line bg-paper-2/30 hover:border-accent/40",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
                  active ? "bg-accent text-white" : "bg-paper-2 text-muted",
                )}
              >
                <VolumeIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {v.name}
                </span>
                <span className="block text-xs text-muted">
                  {v.description}
                </span>
              </span>
              {active && (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PersonCard({
  heading,
  person,
  onChange,
  onPhoto,
}: {
  heading: string;
  person: Person;
  onChange: (p: Person) => void;
  onPhoto: (f: File | null) => void;
}) {
  const set = (patch: Partial<Person>) => onChange({ ...person, ...patch });
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">
        {heading}
      </p>
      <PhotoUpload label={heading} onChange={onPhoto} />
      <Field label="Name">
        <Input
          value={person.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="First name"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age">
          <Input
            value={person.age}
            onChange={(e) => set({ age: e.target.value })}
            placeholder="e.g. 6"
          />
        </Field>
        <Field label="Gender">
          <Input
            value={person.gender}
            onChange={(e) => set({ gender: e.target.value })}
            placeholder="e.g. girl"
          />
        </Field>
      </div>
      <Field label="Looks & personality" hint="optional">
        <Textarea
          value={person.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Curly brown hair, gap-toothed smile, loves dinosaurs and being brave."
        />
      </Field>
    </div>
  );
}

function Row({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-sm font-medium text-ink">
        {value}
        {extra && (
          <span className="rounded-full bg-card px-2 py-0.5 text-xs font-normal text-muted">
            {extra}
          </span>
        )}
      </dd>
    </div>
  );
}
