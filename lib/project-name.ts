// Derives a short, human-friendly project name from the user's prompt.
//
// This is a deterministic heuristic so project creation never blocks on an
// LLM call. Once the AI pipeline lands it can overwrite `projects.name` with
// a model-generated title; this stays as the instant fallback.
//
//   "Build me a habit tracker with streaks and reminders" -> "Habit Tracker"
//   "A minimalist expense tracker"                         -> "Minimalist Expense Tracker"
//   "A recipe app with meal planning"                      -> "Recipe App"
//   "I want an app for booking yoga classes"               -> "Booking Yoga Classes"

const MAX_WORDS = 4
const MAX_LENGTH = 40
export const DEFAULT_PROJECT_NAME = "Untitled Project"

// Leading phrases that describe the request rather than the app itself.
const LEADING_FILLER =
  /^(?:(?:please|can you|could you|i want(?: to)?|i'd like(?: to)?|i would like(?: to)?|let's|lets|help me|build|create|make|design|generate|develop|code|me|us|a|an|the|simple|new|mobile|ios|android|react native|expo|app|application|for|that|which|is|to)\b[\s,:-]*)+/i

// Words that usually start a clause describing features, not the app's name.
const CLAUSE_BREAK =
  /\b(?:with|that|which|where|who|so|to help|to let|allowing|using|including|featuring|for|and|but|like|similar)\b|[,.;:!?()\n]/i

const STOP_WORDS = new Set(["a", "an", "the", "of", "for", "my", "our", "your", "app", "application"])

function titleCase(word: string) {
  // Preserve words the user already cased deliberately (e.g. "AI", "iPhone").
  if (/[A-Z]/.test(word.slice(1))) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function generateProjectName(prompt: string): string {
  let text = prompt.trim().replace(/\s+/g, " ")
  if (!text) return DEFAULT_PROJECT_NAME

  text = text.replace(LEADING_FILLER, "")

  const breakAt = text.search(CLAUSE_BREAK)
  const core = breakAt > 0 ? text.slice(0, breakAt) : text

  let words = core
    .replace(/[^\p{L}\p{N}'&\s-]/gu, "")
    .split(" ")
    .filter(Boolean)

  // Trim stop words from both ends ("recipe app" -> "recipe").
  while (words.length && STOP_WORDS.has(words[0].toLowerCase())) words.shift()
  while (words.length && STOP_WORDS.has(words[words.length - 1].toLowerCase())) words.pop()

  // Prompt was all filler before the first clause ("An app for tracking...").
  // Fall back to the text after the break instead.
  if (words.length === 0 && breakAt > 0) {
    return generateProjectName(text.slice(breakAt).replace(/^[^\p{L}\p{N}]+/u, ""))
  }
  if (words.length === 0) return DEFAULT_PROJECT_NAME

  words = words.slice(0, MAX_WORDS)
  // A lone noun reads oddly as a title ("Recipe") - make it "Recipe App".
  if (words.length === 1) words.push("App")
  let name = words.map(titleCase).join(" ")
  if (name.length > MAX_LENGTH) {
    name = name.slice(0, MAX_LENGTH).replace(/\s+\S*$/, "")
  }
  return name || DEFAULT_PROJECT_NAME
}
