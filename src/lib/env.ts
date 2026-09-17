const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === "") {
    // Don't throw at import time in dev — surface a clear message where used.
    console.warn(`[env] Missing environment variable: ${key}`);
    return "";
  }
  return value;
};

export const env = {
  authSecret: required("AUTH_SECRET", "dev-insecure-secret-change-me"),
  geminiApiKey: required("GEMINI_API_KEY"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  elevenLabsApiKey: required("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: required("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"),
  // Supabase Storage — the private "fable" bucket holds every asset. SUPABASE_KEY
  // is the service_role key: the bucket is private, so the anon key cannot write.
  supabaseUrl: required("SUPABASE_URL"),
  supabaseKey: required("SUPABASE_KEY"),
};

// Model identifiers (kept in one place so they're easy to swap).
export const MODELS = {
  claude: "claude-sonnet-4-6",
  // Nano Banana 2
  nanoBanana: "gemini-3.1-flash-image",
  // Narration model tuned for warm, stable audiobook-style delivery.
  elevenLabs: "eleven_multilingual_v2",
} as const;

export const PAGE_COUNT = 10;
