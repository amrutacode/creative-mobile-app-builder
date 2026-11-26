import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { assistant, system, user, type AgentInputItem } from "@openai/agents"
import { z } from "zod"

import { db, projects, projectAssets, type Project } from "@/db"
import { authenticateRequest } from "@/lib/server/cloudhike-auth"
import { getAssetUrl } from "@/lib/server/storage"
import type { AgentEvent, ProjectStatus } from "@/lib/agent-protocol"
import {
  buildScreenPrompt,
  createPlannerAgent,
  createScreenAgent,
  type PlannerContext,
  type ScreenContext,
} from "@/lib/server/ai-agent/agents"
import { createEventStream, runAgentStreamed, type Emit } from "@/lib/server/ai-agent/run"

// Screen generation can take a while; give platforms that honor this room.
export const maxDuration = 300

/* --------------------------------- Input --------------------------------- */

const text = (max: number) => z.string().max(max)

const planSchema = z.object({
  appName: text(200),
  summary: text(2000),
  targetUsers: text(1000),
  coreFeatures: z.array(text(300)).max(20),
  navigation: text(1000),
  theme: z.object({
    primaryColor: text(40),
    accentColor: text(40),
    backgroundColor: text(40),
    textColor: text(40),
    fontFamily: text(100),
    style: text(300),
  }),
  screens: z
    .array(
      z.object({
        id: text(120),
        name: text(120),
        purpose: text(1000),
        keyElements: z.array(text(300)).max(12),
      })
    )
    .min(1)
    .max(12),
})

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("chat"),
    transcript: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: text(8000) }))
      .max(60),
    plan: planSchema.nullable(),
  }),
  z.object({
    mode: z.literal("screen"),
    plan: planSchema,
    screenId: text(120),
    completed: z.array(z.object({ name: text(120), summary: text(1000) })).max(12),
  }),
])

/* --------------------------------- Helpers -------------------------------- */

async function setProjectStatus(projectId: string, status: ProjectStatus) {
  try {
    await db.update(projects).set({ status }).where(eq(projects.id, projectId))
  } catch (err) {
    console.error("[ai-agent] failed to update project status", (err as Error)?.message)
  }
}

/** The original prompt plus freshly signed reference image URLs, as one user message. */
async function buildRequestMessage(project: Project, intro?: string): Promise<AgentInputItem> {
  const assets = await db
    .select()
    .from(projectAssets)
    .where(eq(projectAssets.projectId, project.id))
  const images = await Promise.all(assets.map((a) => getAssetUrl(a.key)))

  const prompt = project.prompt || "Build me a mobile app based on the attached reference images."
  return user([
    { type: "input_text", text: intro ? `${intro}\n\n${prompt}` : prompt },
    ...images.map((url) => ({ type: "input_image" as const, image: url, detail: "auto" })),
  ])
}

/* ---------------------------------- Route --------------------------------- */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const appUser = await authenticateRequest(request)
  if (!appUser) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
  }

  const { projectId } = await params
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  if (project.userId !== appUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent request" }, { status: 400 })
  }
  const body = parsed.data
  const signal = request.signal

  if (body.mode === "screen" && !body.plan.screens.some((s) => s.id === body.screenId)) {
    return NextResponse.json({ error: "Unknown screen" }, { status: 400 })
  }

  const stream = createEventStream(signal, async (emit) => {
    if (body.mode === "chat") {
      await runPlanning(project, body.transcript, body.plan, emit, signal)
    } else {
      await runScreen(project, body.plan, body.screenId, body.completed, emit, signal)
    }
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  })
}

async function runPlanning(
  project: Project,
  transcript: { role: "user" | "assistant"; content: string }[],
  plan: PlannerContext["currentPlan"],
  emit: Emit,
  signal: AbortSignal
) {
  const isFirstTurn = transcript.length === 0
  emit({ type: "status", label: isFirstTurn ? "Reading your request…" : "Reading your message…" })
  if (isFirstTurn) await setProjectStatus(project.id, "planning")

  const input: AgentInputItem[] = [await buildRequestMessage(project)]
  for (const m of transcript) input.push(m.role === "user" ? user(m.content) : assistant(m.content))
  if (plan) {
    input.push(
      system(
        `The plan currently shown to the user (screen ids are internal):\n\`\`\`json\n${JSON.stringify(plan)}\n\`\`\``
      )
    )
  }

  const context: PlannerContext = {
    currentPlan: plan,
    emit: (event: AgentEvent) => {
      emit(event)
      if (event.type === "plan") void setProjectStatus(project.id, "awaiting_confirmation")
      if (event.type === "confirmed") void setProjectStatus(project.id, "generating")
    },
  }

  await runAgentStreamed(createPlannerAgent(), input, {
    context,
    signal,
    emit,
    hooks: {
      onResponseStarted: (turn) =>
        turn === 1 ? (isFirstTurn ? "Analyzing requirements…" : "Thinking about your feedback…") : null,
      onToolStarted: (name) =>
        name === "present_plan"
          ? isFirstTurn
            ? "Drafting the screen plan…"
            : "Updating the plan…"
          : name === "start_building"
            ? "Starting the build…"
            : null,
    },
  })
}

async function runScreen(
  project: Project,
  plan: z.infer<typeof planSchema>,
  screenId: string,
  completed: { name: string; summary: string }[],
  emit: Emit,
  signal: AbortSignal
) {
  const index = plan.screens.findIndex((s) => s.id === screenId)
  const screen = plan.screens[index]
  emit({ type: "status", label: `Preparing ${screen.name} (${index + 1}/${plan.screens.length})…` })
  await setProjectStatus(project.id, "generating")

  const context: ScreenContext = { emit, screen, result: null }
  const input: AgentInputItem[] = [
    await buildRequestMessage(project, "Original app request from the user:"),
    user(buildScreenPrompt(plan, screen, completed)),
  ]

  let lastReported = 0
  await runAgentStreamed(createScreenAgent(), input, {
    context,
    signal,
    emit,
    maxTurns: 4,
    hooks: {
      onResponseStarted: (turn) => (turn === 1 ? `Designing ${screen.name}…` : `Refining ${screen.name}…`),
      onToolStarted: (name) => (name === "save_screen" ? `Building the ${screen.name} layout…` : null),
      onToolArgsProgress: (chars) => {
        if (chars - lastReported >= 600) {
          lastReported = chars
          emit({ type: "screen_progress", chars })
        }
      },
    },
  })

  if (!context.result) throw new Error(`The designer didn't return the ${screen.name} screen`)
  if (index === plan.screens.length - 1) await setProjectStatus(project.id, "ready")
}
