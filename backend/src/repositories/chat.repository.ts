import { prisma } from "../lib/prisma";

export const chatRepository = {
  createConversation(userId: string) {
    return prisma.conversation.create({ data: { userId } });
  },

  findConversation(id: string, userId: string) {
    return prisma.conversation.findFirst({ where: { id, userId } });
  },

  async listMessages(conversationId: string, limit: number) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return messages.reverse();
  },

  appendMessages(
    conversationId: string,
    userId: string,
    userContent: string,
    assistantContent: string
  ) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({ where: { id: conversationId, userId } });
      if (!conversation) return null;

      await tx.message.create({
        data: { conversationId, role: "user", content: userContent },
      });
      const assistant = await tx.message.create({
        data: { conversationId, role: "assistant", content: assistantContent },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return assistant;
    });
  },
};
