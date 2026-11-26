import { Agent, tool } from "@openai/agents"
import { z } from "zod"

import type { AgentEvent, AppPlan, GeneratedScreen, PlannedScreen } from "@/lib/agent-protocol"
import { getAgentModel } from "./config"

/* -------------------------------------------------------------------------- */
/*                                   Schemas                                  */
/* -------------------------------------------------------------------------- */

const hexColor = z.string().describe("Hex color, e.g. #4F46E5")

const planSchema = z.object({
  appName: z.string().describe("Short, brandable app name"),
  summary: z.string().describe("2-3 sentences: what the app does and the core user value"),
  targetUsers: z.string().describe("Who the app is for"),
  coreFeatures: z.array(z.string()).describe("3-7 core features, one short phrase each"),
  navigation: z
    .string()
    .describe("How screens connect, e.g. 'Bottom tabs: Home, Explore, Profile; Home -> Details stack'"),
  theme: z.object({
    primaryColor: hexColor,
    accentColor: hexColor,
    backgroundColor: hexColor,
    textColor: hexColor,
    fontFamily: z.string().describe("A Google Font family name, e.g. Inter, Poppins, DM Sans"),
    style: z.string().describe("Visual style in a few words, e.g. 'soft, rounded, airy, playful'"),
  }),
  screens: z
    .array(
      z.object({
        name: z.string().describe("Screen name, e.g. 'Home', 'Workout Details'"),
        purpose: z.string().describe("One or two sentences on what the user does on this screen"),
        keyElements: z.array(z.string()).describe("3-6 key UI elements / sections on this screen"),
      })
    )
    .min(1)
    .max(12)
    .describe("Screens in the order they will be generated; most important first"),
})

/* -------------------------------------------------------------------------- */
/*                                   Planner                                  */
/* -------------------------------------------------------------------------- */

export type PlannerContext = {
  emit: (event: AgentEvent) => void
  /** The plan currently shown to the user (null before the first plan). */
  currentPlan: AppPlan | null
}

const PLANNER_INSTRUCTIONS = `You are AppForge Agent, a senior mobile product designer who turns ideas into polished mobile app designs. You are talking with the user in the chat panel of the AppForge workspace. Next to the chat there is a canvas where the screens you design will appear.

# Your job in this conversation
1. Understand the request. Read the user's prompt and any reference images carefully. Work out the app's purpose, audience, core flows and visual direction. If something is ambiguous, make a sensible, clearly stated assumption instead of blocking. Only ask a question with no plan when the request is truly impossible to interpret (e.g. empty or nonsense).
2. Plan the app. Decide which screens are needed for a complete, coherent first version (typically 4-8 screens, at most 12). Include the main flow end to end (e.g. onboarding/auth only if it adds value, home, core feature screens, detail screens, profile/settings). Pick a cohesive theme (colors, font, style) that fits the product and any reference images.
3. Present the plan. First write a short, friendly message in Markdown (under ~150 words) covering: your understanding of the app in one or two sentences, key decisions/assumptions you made, and anything notable about the design direction. Do NOT list every screen in prose; the plan card shows the screens. Then call the \`present_plan\` tool with the complete plan. After the tool returns, end with ONE short sentence inviting the user to confirm (e.g. "Does this look right? Confirm to start building, or tell me what to change.").
4. Wait for confirmation. Never start building on your own.
5. Handle feedback. When the user asks for changes, briefly acknowledge what you changed (1-3 sentences), then call \`present_plan\` again with the FULL updated plan (not a diff), then invite confirmation again. Keep everything the user didn't ask to change.
6. Start building only when the user clearly approves the current plan ("looks good", "go ahead", "build it", "yes", "confirm", etc.). Then reply with one short sentence like "Great, starting with the Home screen." and call \`start_building\`. If the message mixes approval with changes, treat it as feedback (step 5) instead.

# Rules
- Every response that creates or changes the plan MUST call \`present_plan\`.
- Never write code or HTML in the chat; screens are generated in a later step.
- Questions unrelated to the plan: answer briefly and steer back to the plan.
- Be warm, concise and confident. Use plain language, not jargon.`

export function createPlannerAgent() {
  const presentPlan = tool({
    name: "present_plan",
    description:
      "Show the complete app plan to the user as an interactive plan card. Call this every time you create or update the plan.",
    parameters: planSchema,
    execute: async (input, runContext) => {
      const ctx = runContext?.context as PlannerContext
      const plan = withScreenIds(input)
      ctx.currentPlan = plan
      ctx.emit({ type: "plan", plan })
      return "The plan card is now visible to the user. Finish with one short sentence asking them to confirm or request changes. Do not repeat the plan."
    },
  })

  const startBuilding = tool({
    name: "start_building",
    description:
      "Start generating the screens of the CURRENT plan. Only call this after the user has explicitly approved the plan.",
    parameters: z.object({}),
    execute: async (_input, runContext) => {
      const ctx = runContext?.context as PlannerContext
      if (!ctx.currentPlan) return "There is no plan yet. Present a plan first."
      ctx.emit({ type: "confirmed" })
      return "Build started."
    },
  })

  return new Agent<PlannerContext>({
    name: "AppForge Planner",
    instructions: PLANNER_INSTRUCTIONS,
    model: getAgentModel(),
    modelSettings: {
      reasoning: { effort: "low", summary: "auto" },
      parallelToolCalls: false,
    },
    tools: [presentPlan, startBuilding],
    // Stop the run right after start_building so the client takes over generation.
    toolUseBehavior: { stopAtToolNames: ["start_building"] },
  })
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "screen"
}

function withScreenIds(plan: z.infer<typeof planSchema>): AppPlan {
  const seen = new Set<string>()
  const screens: PlannedScreen[] = plan.screens.map((screen) => {
    let id = `screen-${slugify(screen.name)}`
    for (let n = 2; seen.has(id); n++) id = `screen-${slugify(screen.name)}-${n}`
    seen.add(id)
    return { id, ...screen }
  })
  return { ...plan, screens }
}

/* -------------------------------------------------------------------------- */
/*                               Screen designer                              */
/* -------------------------------------------------------------------------- */

export type ScreenContext = {
  emit: (event: AgentEvent) => void
  screen: PlannedScreen
  result: GeneratedScreen | null
}

const MAX_SCREEN_HTML = 200_000

const SCREEN_INSTRUCTIONS = `You are AppForge Screen Designer, an expert mobile UI designer and front-end engineer. You design ONE mobile app screen at a time from an approved app plan, as a high-fidelity, self-contained HTML mockup that is shown inside a phone frame.

# Workflow
1. Write ONE or TWO short sentences (plain text, no Markdown headings) telling the user what you're designing on this screen and the key design choice. This is streamed live into the chat.
2. Call \`save_screen\` with the complete HTML and a one-sentence summary. Do not write anything after calling it.

# HTML requirements
- A complete document: <!doctype html><html><head>...</head><body>...</body></html>, with <meta name="viewport" content="width=device-width, initial-scale=1">.
- Designed for a 390px wide phone viewport. The body should fill the viewport height (min-height: 100vh) and must not scroll horizontally. Content may scroll vertically.
- Do NOT draw a device frame, notch or OS status bar: the canvas adds those. Start with the app's own header.
- All CSS in a single <style> tag. No JavaScript at all (scripts are blocked). No external images.
- You may load the theme font from Google Fonts with a <link> tag. Everything else must be inline.
- Use the plan's theme colors, font and style exactly, so every screen feels like the same app.
- Icons: inline SVG (simple, consistent stroke icons). Imagery: CSS gradients, shapes, emoji or inline SVG illustrations.
- Use realistic, specific content (names, numbers, dates, prices), never lorem ipsum.
- Include the app's persistent navigation (e.g. bottom tab bar) when the plan's navigation calls for it, with the current screen highlighted.
- Quality bar: polished, modern, production-grade mobile UI with clear hierarchy, generous spacing, rounded corners, subtle shadows and good contrast. Touch targets at least 44px.`

export function createScreenAgent() {
  const saveScreen = tool({
    name: "save_screen",
    description: "Save the finished screen. Call exactly once, with the complete HTML document.",
    parameters: z.object({
      summary: z.string().describe("One sentence describing the screen you built"),
      html: z.string().describe("The complete, self-contained HTML document"),
    }),
    execute: async ({ summary, html }, runContext) => {
      const ctx = runContext?.context as ScreenContext
      if (html.length > MAX_SCREEN_HTML) {
        return `The HTML is too large (${html.length} chars, max ${MAX_SCREEN_HTML}). Simplify it and call save_screen again.`
      }
      const screen: GeneratedScreen = {
        id: ctx.screen.id,
        name: ctx.screen.name,
        summary,
        html: stripScripts(html),
      }
      ctx.result = screen
      ctx.emit({ type: "screen", screen })
      return "Saved."
    },
  })

  return new Agent<ScreenContext>({
    name: "AppForge Screen Designer",
    instructions: SCREEN_INSTRUCTIONS,
    model: getAgentModel(),
    modelSettings: {
      reasoning: { effort: "low", summary: "auto" },
      parallelToolCalls: false,
    },
    tools: [saveScreen],
    // Stop as soon as a screen is saved; an oversized-HTML retry message lets the model try again.
    toolUseBehavior: (runContext) => {
      const ctx = runContext.context as ScreenContext
      return ctx.result
        ? { isFinalOutput: true, isInterrupted: undefined, finalOutput: "saved" }
        : { isFinalOutput: false, isInterrupted: undefined }
    },
  })
}

/** Defense in depth: the iframe sandbox already blocks scripts. */
function stripScripts(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
}

export function buildScreenPrompt(
  plan: AppPlan,
  screen: PlannedScreen,
  completed: { name: string; summary: string }[]
) {
  const index = plan.screens.findIndex((s) => s.id === screen.id)
  return [
    `# Approved app plan`,
    "```json",
    JSON.stringify(plan, null, 2),
    "```",
    completed.length
      ? `# Screens already built (keep them visually consistent)\n${completed
          .map((c) => `- ${c.name}: ${c.summary}`)
          .join("\n")}`
      : "# This is the first screen. It sets the visual language for the rest of the app.",
    `# Your task`,
    `Design screen ${index + 1} of ${plan.screens.length}: "${screen.name}".`,
    `Purpose: ${screen.purpose}`,
    `Key elements: ${screen.keyElements.join("; ")}`,
  ].join("\n\n")
}
