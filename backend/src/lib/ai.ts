import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../config/env";

let client: OpenAI | undefined;

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
      timeout: 20_000,
      maxRetries: 1,
    });
  }
  return client;
}

export async function createChatCompletion(messages: ChatCompletionMessageParam[]) {
  const completion = await getClient().chat.completions.create({
    model: env.AI_MODEL,
    messages,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty reply");
  return content;
}
