import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { NotFoundError } from "../lib/errors";
import { createChatCompletion } from "../lib/ai";
import { chatRepository } from "../repositories/chat.repository";
import { shipmentService } from "./shipment.service";
import type { ChatMessageInput } from "../schemas/chat.schema";

const SYSTEM_PROMPT =
  "You are the assistant of a Customer and Shipment Management platform for logistics staff. " +
  "Answer concisely. Use only the provided platform data for facts about shipments and customers. " +
  "If the data does not contain the answer, say so. Never invent tracking numbers, statuses or customers. " +
  "Refuse requests unrelated to the platform politely.";

interface PlatformContext {
  dashboard: Awaited<ReturnType<typeof shipmentService.dashboardStats>>;
  trackingNumber?: string;
  shipment?: Awaited<ReturnType<typeof shipmentService.findByTrackingNumber>>;
}

async function buildContext(message: string): Promise<PlatformContext> {
  const trackingNumber = message.match(/\bTRK-\d+\b/i)?.[0].toUpperCase();
  const [dashboard, shipment] = await Promise.all([
    shipmentService.dashboardStats(),
    trackingNumber ? shipmentService.findByTrackingNumber(trackingNumber) : Promise.resolve(null),
  ]);
  return { dashboard, trackingNumber, shipment: shipment ?? undefined };
}

function contextMessage(context: PlatformContext) {
  const dashboard = context.dashboard;
  const lines = [
    "Read-only platform context:",
    `Dashboard: ${dashboard.totalCustomers} customers, ${dashboard.totalShipments} shipments.`,
    `Shipment counts by status: ${JSON.stringify(dashboard.byStatus)}.`,
  ];

  if (context.trackingNumber) {
    if (context.shipment) {
      lines.push(
        `Tracking ${context.trackingNumber}: status ${context.shipment.status}; ` +
          `origin ${context.shipment.origin}; destination ${context.shipment.destination}; ` +
          `customer ${context.shipment.customer?.name ?? "unknown"}.`
      );
    } else {
      lines.push(`No shipment was found for tracking number ${context.trackingNumber}.`);
    }
  }
  return lines.join("\n");
}

function mockReply(context: PlatformContext) {
  if (context.trackingNumber && context.shipment) {
    return (
      `[Demo mode - no AI provider reachable] Shipment ${context.trackingNumber} is ` +
      `${context.shipment.status}, traveling from ${context.shipment.origin} to ` +
      `${context.shipment.destination}.`
    );
  }
  if (context.trackingNumber) {
    return `[Demo mode - no AI provider reachable] No shipment was found for ${context.trackingNumber}.`;
  }
  return (
    `[Demo mode - no AI provider reachable] The platform has ${context.dashboard.totalShipments} ` +
    `shipments and ${context.dashboard.totalCustomers} customers. Ask about a tracking number ` +
    "or the dashboard totals."
  );
}

function logProviderFailure(error: unknown) {
  logger.warn(
    {
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    "AI provider failed; using demo reply"
  );
}

export const chatService = {
  async sendMessage(input: ChatMessageInput, userId: string) {
    const conversation = input.conversationId
      ? await chatRepository.findConversation(input.conversationId, userId)
      : await chatRepository.createConversation(userId);
    if (!conversation) throw new NotFoundError("Conversation");

    const history = await chatRepository.listMessages(conversation.id, env.CHAT_HISTORY_LIMIT);
    const context = await buildContext(input.message);
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: contextMessage(context) },
      ...history.map((item) => ({ role: item.role, content: item.content } as ChatCompletionMessageParam)),
      { role: "user", content: input.message },
    ];

    let mode: "ai" | "mock" = "mock";
    let reply = mockReply(context);
    if (env.OPENAI_API_KEY) {
      try {
        reply = await createChatCompletion(messages);
        mode = "ai";
      } catch (error) {
        logProviderFailure(error);
      }
    }

    const assistant = await chatRepository.appendMessages(
      conversation.id,
      userId,
      input.message,
      reply
    );
    if (!assistant) throw new NotFoundError("Conversation");

    return {
      conversationId: conversation.id,
      mode,
      reply: {
        role: "assistant" as const,
        content: assistant.content,
        createdAt: assistant.createdAt.toISOString(),
      },
    };
  },

  async history(conversationId: string, userId: string) {
    const conversation = await chatRepository.findConversation(conversationId, userId);
    if (!conversation) throw new NotFoundError("Conversation");
    const messages = await chatRepository.listMessages(conversationId, Number.MAX_SAFE_INTEGER);
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }));
  },
};
