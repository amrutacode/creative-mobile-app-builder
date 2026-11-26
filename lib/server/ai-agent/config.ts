// OpenAI configuration for the AI Agent service ONLY.
//
// The rest of the app (auth, database, storage) keeps talking to CloudHike
// through its own clients and env vars. Nothing in this module touches those,
// and nothing here mutates global state:
//   - no set_default_openai_key / setDefaultOpenAIClient / setDefaultOpenAIKey
//   - no writes to process.env.OPENAI_API_KEY / OPENAI_BASE_URL
// The client below is attached to the agent's model instance and nowhere else.

import OpenAI from "openai"
import { OpenAIResponsesModel } from "@openai/agents"

/** OpenAI's public API. Pinned so a stray OPENAI_BASE_URL can't redirect agent traffic. */
export const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1"

/** Override with AI_AGENT_MODEL in .env if you want a different OpenAI model. */
export const AI_AGENT_MODEL = process.env.AI_AGENT_MODEL?.trim() || "gpt-5.4"

export class AgentConfigError extends Error {}

const globalForAgent = globalThis as unknown as {
  aiAgentClient?: OpenAI
  aiAgentModel?: OpenAIResponsesModel
}

/** Dedicated OpenAI client for the agent service (the TS equivalent of Python's AsyncOpenAI). */
export function getAgentClient(): OpenAI {
  if (globalForAgent.aiAgentClient) return globalForAgent.aiAgentClient

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) throw new AgentConfigError("AI_API_KEY is not configured")

  const client = new OpenAI({
    apiKey,
    baseURL: OPENAI_DEFAULT_BASE_URL,
    // Explicit nulls so OPENAI_ORG_ID / OPENAI_PROJECT_ID env vars can't leak in.
    organization: null,
    project: null,
    maxRetries: 2,
    timeout: 180_000,
  })
  globalForAgent.aiAgentClient = client
  return client
}

/** The model every agent uses, bound to the dedicated client above. */
export function getAgentModel(): OpenAIResponsesModel {
  globalForAgent.aiAgentModel ??= new OpenAIResponsesModel(getAgentClient(), AI_AGENT_MODEL)
  return globalForAgent.aiAgentModel
}
