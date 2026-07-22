export type BookTypeDef = {
  id: string;
  label: string;
  tagline: string;
  blurb: string;
  styleHint: string;
};

export const BOOK_TYPES: BookTypeDef[] = [
  {
    id: "kids",
    label: "For a child",
    tagline: "A bedtime adventure",
    blurb:
      "A gentle, imaginative tale where your child is the hero, alongside the parent who loves them.",
    styleHint: "Soft Storybook Watercolor",
  },
  {
    id: "lovers",
    label: "For a loved one",
    tagline: "A keepsake romance",
    blurb:
      "A warm, romantic story that turns your shared moments into an heirloom worth keeping.",
    styleHint: "Golden Hour Gouache",
  },
  {
    id: "family",
    label: "Family memory",
    tagline: "A moment, remembered",
    blurb:
      "Capture a real memory or milestone and retell it as a timeless illustrated story.",
    styleHint: "Nostalgic Ink & Wash",
  },
  {
    id: "adventure",
    label: "Grand adventure",
    tagline: "An epic quest",
    blurb:
      "A bold journey across imagined worlds, starring the two of you as fearless explorers.",
    styleHint: "Cinematic Painterly Illustration",
  },
];

export const NARRATOR_VOICES: { id: string; name: string; description: string }[] =
  [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm, calm narrator" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Bright and expressive" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft and soothing" },
    { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Deep, storyteller tone" },
  ];

// Prompt-style questions to help Claude craft a great story.
export const STORY_QUESTIONS: string[] = [
  "What is the occasion for this book?",
  "What do these two love doing together?",
  "Describe a favorite shared memory",
  "What lesson or feeling should the story leave behind?",
  "Any favorite places, pets, or objects to include?",
];
