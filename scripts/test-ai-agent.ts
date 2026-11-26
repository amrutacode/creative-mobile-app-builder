/**
 * Quick integration test for the AI agent setup.
 *
 *   npm run test:agent
 *
 * 1. The AI agent reaches OpenAI directly with AI_API_KEY (dedicated client,
 *    default base URL, real streamed planner run that produces a plan).
 * 2. The existing CloudHike services still work unchanged (env untouched,
 *    auth API, Postgres and S3 storage reachable through their own clients).
 *
 * Secrets are never printed: values are only compared, or reported as hashes.
 */
import { createHash } from "node:crypto"

const CLOUDHIKE_ENV = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_URL",
  "AUTH_PUBLISHABLE_KEY",
  "AUTH_SECRET_KEY",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_AUTH_PUBLISHABLE_KEY",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
]
const GLOBAL_OPENAI_ENV = ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID"]

let failures = 0
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? ` (${detail})` : ""}`)
}

function envFingerprint(keys: string[]) {
  return createHash("sha256")
    .update(keys.map((k) => `${k}=${process.env[k] ?? "<unset>"}`).join("\n"))
    .digest("hex")
}

// Record which hosts are called and whether OpenAI calls carry AI_API_KEY.
type Call = { host: string; usedAgentKey: boolean }
const calls: Call[] = []
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  calls.push({
    host: url.host,
    usedAgentKey: headers.get("authorization") === `Bearer ${process.env.AI_API_KEY}`,
  })
  return realFetch(input, init)
}) as typeof fetch

async function main() {
  if (!process.env.AI_API_KEY) throw new Error("AI_API_KEY is not set in .env")

  const cloudHikeBefore = envFingerprint(CLOUDHIKE_ENV)
  const globalOpenAIBefore = envFingerprint(GLOBAL_OPENAI_ENV)

  // Import agent modules only after taking the snapshots.
  const { getAgentClient, getAgentModel, OPENAI_DEFAULT_BASE_URL, AI_AGENT_MODEL } = await import(
    "../lib/server/ai-agent/config"
  )
  const { createPlannerAgent } = await import("../lib/server/ai-agent/agents")
  const { runAgentStreamed } = await import("../lib/server/ai-agent/run")
  const { user } = await import("@openai/agents")

  /* ------------------------------------------------------------------ */
  console.log("\n1) AI agent → OpenAI (AI_API_KEY)")

  const client = getAgentClient()
  check("dedicated client uses OpenAI's default base URL", client.baseURL === OPENAI_DEFAULT_BASE_URL, client.baseURL)
  check("dedicated client uses AI_API_KEY", client.apiKey === process.env.AI_API_KEY)
  check("model is bound to the agent's model instance", getAgentModel() === createPlannerAgent().model)

  const events: { type: string }[] = []
  let plan: { appName: string; screens: { name: string }[] } | null = null
  const started = Date.now()
  const before = calls.length
  await runAgentStreamed(
    createPlannerAgent(),
    [user("A simple habit tracker app where I can add daily habits and see my streaks.")],
    {
      context: { currentPlan: null, emit: (e) => (e.type === "plan" ? (plan = e.plan) : null) },
      signal: AbortSignal.timeout(180_000),
      emit: (e) => events.push(e),
      hooks: { onResponseStarted: () => "Analyzing requirements…" },
    }
  )
  const openaiCalls = calls.slice(before)
  check(
    "requests went to api.openai.com with AI_API_KEY",
    openaiCalls.length > 0 && openaiCalls.every((c) => c.host === "api.openai.com" && c.usedAgentKey),
    `${openaiCalls.length} request(s)`
  )
  check("streamed text deltas arrived", events.some((e) => e.type === "text_delta"))
  check("streamed status updates arrived", events.some((e) => e.type === "status"))
  const gotPlan = plan as { appName: string; screens: { name: string }[] } | null
  check(
    "planner produced a plan via present_plan",
    Boolean(gotPlan && gotPlan.screens.length > 0),
    gotPlan ? `${gotPlan.appName}: ${gotPlan.screens.map((s) => s.name).join(", ")}` : "no plan"
  )
  console.log(`    model ${AI_AGENT_MODEL}, ${((Date.now() - started) / 1000).toFixed(1)}s`)

  /* ------------------------------------------------------------------ */
  console.log("\n2) CloudHike services unchanged")

  check("CloudHike env vars unchanged", envFingerprint(CLOUDHIKE_ENV) === cloudHikeBefore)
  check(
    "no global OpenAI env vars were set (OPENAI_API_KEY / OPENAI_BASE_URL / …)",
    envFingerprint(GLOBAL_OPENAI_ENV) === globalOpenAIBefore
  )

  // Auth API: no token → the session endpoint should answer (typically 401 or a null session).
  const authHost = new URL(process.env.AUTH_URL!).host
  const authStart = calls.length
  try {
    const res = await fetch(`${process.env.AUTH_URL}/get-session`, {
      headers: { "x-api-key": process.env.AUTH_PUBLISHABLE_KEY ?? "" },
      cache: "no-store",
    })
    check("CloudHike auth API reachable", res.status < 500, `HTTP ${res.status}`)
    const authCalls = calls.slice(authStart)
    check(
      "auth request went to the CloudHike host, without the OpenAI key",
      authCalls.every((c) => c.host === authHost && !c.usedAgentKey)
    )
  } catch (err) {
    check("CloudHike auth API reachable", false, (err as Error).message)
  }

  // Database (Postgres via Drizzle).
  const { db, projects } = await import("../db")
  try {
    const rows = await db.select({ id: projects.id }).from(projects).limit(1)
    check("CloudHike Postgres query works", Array.isArray(rows), `${rows.length} row(s) sampled`)
  } catch (err) {
    check("CloudHike Postgres query works", false, (err as Error).message)
  } finally {
    await db.$client.end({ timeout: 5 })
  }

  // Storage (S3-compatible), read-only.
  try {
    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3")
    const s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    })
    await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }))
    check("CloudHike S3 bucket reachable", true)
  } catch (err) {
    check("CloudHike S3 bucket reachable", false, (err as Error).name)
  }

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Test crashed:", (err as Error)?.name, (err as Error)?.message)
  process.exit(1)
})
