import { Runner, type Agent, type AgentInputItem } from "@openai/agents"

import type { AgentEvent } from "@/lib/agent-protocol"
import { AgentConfigError } from "./config"

export type Emit = (event: AgentEvent) => void

/** Hooks that turn low-level stream events into friendly status messages. */
export type StatusHooks = {
  onResponseStarted?: (turn: number) => string | null
  onToolStarted?: (toolName: string) => string | null
  /** Called with the running length of streamed tool-call arguments. */
  onToolArgsProgress?: (chars: number) => void
}

// The SDK's default trace exporter reads OPENAI_API_KEY from the environment.
// We disable tracing per runner (not globally) so the agent never depends on,
// or reports to, any key other than its dedicated AI_API_KEY client.
const runner = new Runner({ tracingDisabled: true, workflowName: "AppForge agent" })

/**
 * Runs an agent with the Agents SDK's streaming mode (the TS equivalent of
 * Runner.run_streamed) and forwards progress to the client as it happens.
 */
export async function runAgentStreamed<TContext>(
  agent: Agent<TContext, any>,
  input: AgentInputItem[],
  options: { context: TContext; signal: AbortSignal; emit: Emit; hooks?: StatusHooks; maxTurns?: number }
) {
  const { context, signal, emit, hooks = {}, maxTurns = 6 } = options
  const result = await runner.run(agent, input, { stream: true, context, signal, maxTurns })

  let turn = 0
  let hasText = false
  let thinkingAnnounced = false
  let argsChars = 0

  for await (const event of result) {
    if (event.type !== "raw_model_stream_event") continue
    const data = event.data

    if (data.type === "response_started") {
      turn += 1
      thinkingAnnounced = false
      const label = hooks.onResponseStarted?.(turn)
      if (label) emit({ type: "status", label })
      continue
    }

    if (data.type === "output_text_delta") {
      emit({ type: "text_delta", delta: data.delta })
      hasText = true
      continue
    }

    if (data.type !== "model") continue
    const raw = data.event as { type?: string; delta?: string; item?: { type?: string; name?: string } }

    switch (raw.type) {
      case "response.reasoning_summary_text.delta":
        if (!thinkingAnnounced) {
          emit({ type: "status", label: "Thinking…" })
          thinkingAnnounced = true
        }
        if (raw.delta) emit({ type: "thinking_delta", delta: raw.delta })
        break
      case "response.output_item.added":
        if (raw.item?.type === "message" && hasText) {
          // A new assistant message after earlier text (e.g. after a tool call).
          emit({ type: "text_delta", delta: "\n\n" })
        } else if (raw.item?.type === "function_call" && raw.item.name) {
          argsChars = 0
          const label = hooks.onToolStarted?.(raw.item.name)
          if (label) emit({ type: "status", label })
        }
        break
      case "response.function_call_arguments.delta":
        argsChars += raw.delta?.length ?? 0
        hooks.onToolArgsProgress?.(argsChars)
        break
    }
  }

  await result.completed
  if (result.error) throw result.error
  return result
}

const encoder = new TextEncoder()

/** Wraps agent work in a newline-delimited JSON stream response body. */
export function createEventStream(signal: AbortSignal, work: (emit: Emit) => Promise<void>) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const emit: Emit = (event) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
        } catch {
          open = false
        }
      }
      try {
        await work(emit)
        emit({ type: "done" })
      } catch (err) {
        if (!signal.aborted) {
          logAgentError(err)
          emit({ type: "error", message: toUserMessage(err) })
        }
      } finally {
        open = false
        try {
          controller.close()
        } catch {
          // already closed by a client disconnect
        }
      }
    },
  })
}

function logAgentError(err: unknown) {
  // Log type/status/message only; never request options or headers (which hold the key).
  const e = err as { name?: string; status?: number; message?: string }
  console.error("[ai-agent]", e?.name ?? "Error", e?.status ?? "", e?.message ?? String(err))
}

function toUserMessage(err: unknown): string {
  if (err instanceof AgentConfigError) return "The AI agent isn't configured on the server yet."
  const status = (err as { status?: number })?.status
  if (status === 401 || status === 403) return "The AI service rejected our credentials. Please contact support."
  if (status === 429) return "The AI service is busy right now. Please try again in a moment."
  if (typeof status === "number" && status >= 500) return "The AI service had a problem. Please try again."
  const name = (err as { name?: string })?.name
  if (name === "MaxTurnsExceededError") return "The agent took too many steps. Please try again."
  return "Something went wrong while the agent was working. Please try again."
}
