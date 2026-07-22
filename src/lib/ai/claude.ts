import Anthropic from "@anthropic-ai/sdk";
import { env, MODELS, PAGE_COUNT } from "../env";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

export type BriefCharacter = {
  role: "child" | "parent";
  name: string;
  age?: string;
  gender?: string;
  description?: string;
  hasPhoto: boolean;
};

export type BookBrief = {
  bookType: string; // kids | lovers | family | adventure
  language: string;
  title?: string;
  dedication?: string;
  styleHint?: string;
  characters: BriefCharacter[];
  details: { question: string; answer: string }[];
};

export type StoryPlan = {
  title: string;
  dedication?: string;
  styleName: string;
  stylePrompt: string;
  characterSheetPrompt: string;
  pages: { text: string; imagePrompt: string }[];
};

const SYSTEM = `You are a world-class picture-book author AND art director.
You create deeply personal, emotionally resonant illustrated stories.
You must respond with a SINGLE JSON object and nothing else — no markdown fences, no commentary.`;

function buildUserPrompt(brief: BookBrief): string {
  const chars = brief.characters
    .map(
      (c) =>
        `- role: ${c.role}; name: ${c.name}; age: ${c.age ?? "n/a"}; gender: ${
          c.gender ?? "n/a"
        }; notes: ${c.description ?? "n/a"}; referencePhotoProvided: ${c.hasPhoto}`,
    )
    .join("\n");

  const extra = brief.details
    .filter((d) => d.answer?.trim())
    .map((d) => `- ${d.question}: ${d.answer}`)
    .join("\n");

  return `Create a personalized illustrated book.

BOOK TYPE: ${brief.bookType}
LANGUAGE: write the story in ${brief.language}
${brief.title ? `PREFERRED TITLE: ${brief.title}` : ""}
${brief.dedication ? `DEDICATION: ${brief.dedication}` : ""}
${brief.styleHint ? `STYLE HINT FROM USER: ${brief.styleHint}` : ""}

CHARACTERS (this is an MVP with exactly two people — a child and a parent):
${chars}

ADDITIONAL DETAILS FROM THE USER:
${extra || "(none provided)"}

Produce EXACTLY ${PAGE_COUNT} story pages. Each page has:
- "text": 2-5 warm sentences of story for that page, in ${brief.language}.
- "imagePrompt": a rich English illustration prompt for that single page.

Rules for imagePrompt (VERY IMPORTANT):
- Describe ONE illustration per page, a single coherent scene.
- ALWAYS refer to the characters by their consistent physical description so
  their faces and outfits stay identical across every page.
- Describe faces with rich, specific detail (face shape, eyes, hair, skin tone,
  distinguishing features) so the people feel truly recognizable and personal.
- Do NOT put any words, letters, captions or text inside the illustration.
- Keep the same art style across all pages.

Also produce:
- "styleName": a short human-readable name for the chosen art style.
- "stylePrompt": one paragraph of concrete art-direction (medium, palette,
  lighting, linework, mood) that will be appended to every image prompt so the
  whole book is visually consistent.
- "characterSheetPrompt": a prompt for a SINGLE reference illustration that
  shows ALL characters together, full body, neutral friendly pose, in the chosen
  art style, with extremely detailed, personal faces. This image is generated
  first and reused as the style/character anchor for every page.
- "title" and optional "dedication".

Return JSON with EXACTLY this shape:
{
  "title": string,
  "dedication": string | null,
  "styleName": string,
  "stylePrompt": string,
  "characterSheetPrompt": string,
  "pages": [ { "text": string, "imagePrompt": string }, ... ${PAGE_COUNT} items ]
}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to first {...} block.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Claude did not return valid JSON");
  }
}

export async function generateStoryPlan(brief: BookBrief): Promise<StoryPlan> {
  const message = await anthropic.messages.create({
    model: MODELS.claude,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(brief) }],
  });

  const textPart = message.content.find((c) => c.type === "text");
  const raw = textPart && textPart.type === "text" ? textPart.text : "";
  const parsed = extractJson(raw) as Partial<StoryPlan> & {
    pages?: { text: string; imagePrompt: string }[];
  };

  let pages = Array.isArray(parsed.pages) ? parsed.pages : [];
  // Normalize to exactly PAGE_COUNT pages.
  pages = pages
    .filter((p) => p && typeof p.text === "string")
    .slice(0, PAGE_COUNT)
    .map((p) => ({
      text: String(p.text ?? ""),
      imagePrompt: String(p.imagePrompt ?? ""),
    }));
  while (pages.length < PAGE_COUNT) {
    pages.push({ text: "", imagePrompt: "" });
  }

  return {
    title: parsed.title?.trim() || brief.title || "Our Story",
    dedication: parsed.dedication?.trim() || brief.dedication || undefined,
    styleName: parsed.styleName?.trim() || brief.styleHint || "Storybook Watercolor",
    stylePrompt: parsed.stylePrompt?.trim() || "",
    characterSheetPrompt: parsed.characterSheetPrompt?.trim() || "",
    pages,
  };
}
