import { z } from "zod";

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
