import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";
import { createChatCompletion } from "../src/lib/ai";

vi.mock("../src/lib/ai", () => ({ createChatCompletion: vi.fn() }));

const mockedCompletion = vi.mocked(createChatCompletion);
const originalKey = env.OPENAI_API_KEY;
const originalHistoryLimit = env.CHAT_HISTORY_LIMIT;
let auth: { Authorization: string };

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "Admin@123" });
  auth = { Authorization: `Bearer ${res.body.token}` };
});

beforeEach(() => {
  env.OPENAI_API_KEY = "test-key";
  env.CHAT_HISTORY_LIMIT = 10;
  mockedCompletion.mockReset();
  mockedCompletion.mockResolvedValue("AI reply");
});

afterEach(() => {
  env.OPENAI_API_KEY = "test-key";
  env.CHAT_HISTORY_LIMIT = 10;
});

afterAll(async () => {
  env.OPENAI_API_KEY = originalKey;
  env.CHAT_HISTORY_LIMIT = originalHistoryLimit;
});

async function send(message: string, conversationId?: string) {
  return request(app)
    .post("/api/chat")
    .set(auth)
    .send({ message, ...(conversationId ? { conversationId } : {}) });
}

describe("chat", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/chat").send({ message: "Hello" });
    expect(res.status).toBe(401);
  });

  it("rejects empty and overlong messages", async () => {
    const empty = await send("   ");
    const long = await send("x".repeat(2001));

    expect(empty.status).toBe(400);
    expect(long.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a conversation and returns ordered history", async () => {
    const sent = await send("How many shipments do I have?");
    expect(sent.status).toBe(200);
    expect(sent.body.mode).toBe("ai");
    expect(sent.body.reply).toMatchObject({ role: "assistant", content: "AI reply" });

    const history = await request(app)
      .get(`/api/chat/${sent.body.conversationId}`)
      .set(auth);
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(2);
    expect(history.body.map((message: { role: string }) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  it("passes previous messages and respects the history limit", async () => {
    env.CHAT_HISTORY_LIMIT = 2;
    const first = await send("history-one");
    const conversationId = first.body.conversationId as string;
    await send("history-two", conversationId);
    await send("history-three", conversationId);

    const lastCall = mockedCompletion.mock.calls.at(-1);
    const messages = lastCall?.[0] as Array<{ content?: unknown }>;
    const contents = messages.map((message) => String(message.content));
    expect(contents).toContain("history-two");
    expect(contents).toContain("AI reply");
    expect(contents).not.toContain("history-one");
    expect(messages).toHaveLength(5);
  });

  it("falls back to a mock reply when the provider throws", async () => {
    mockedCompletion.mockRejectedValue(new Error("provider unavailable"));
    const res = await send("What are the dashboard totals?");

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("mock");
    expect(res.body.reply.content).toMatch(/^\[Demo mode/);
  });

  it("falls back to a mock reply when no API key is configured", async () => {
    env.OPENAI_API_KEY = undefined;
    const res = await send("What are the dashboard totals?");

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("mock");
    expect(res.body.reply.content).toMatch(/^\[Demo mode/);
    expect(mockedCompletion).not.toHaveBeenCalled();
  });

  it("does not expose another user's conversation", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `chat-other-${Date.now()}@example.com`,
        passwordHash: "test-hash",
        name: "Other User",
      },
    });
    const otherConversation = await prisma.conversation.create({ data: { userId: otherUser.id } });

    try {
      const post = await send("Can I see this?", otherConversation.id);
      const get = await request(app).get(`/api/chat/${otherConversation.id}`).set(auth);
      expect(post.status).toBe(404);
      expect(get.status).toBe(404);
    } finally {
      await prisma.message.deleteMany({ where: { conversationId: otherConversation.id } });
      await prisma.conversation.delete({ where: { id: otherConversation.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    }
  });

  it("includes seeded shipment context for a tracking-number question", async () => {
    await send("What is the status of TRK-1001?");
    const lastCall = mockedCompletion.mock.calls.at(-1);
    const contents = (lastCall?.[0] as Array<{ content?: unknown }>).map((message) =>
      String(message.content)
    );
    expect(contents.join("\n")).toContain("TRK-1001");
    expect(contents.join("\n")).toContain("Created");
    expect(contents.join("\n")).toContain("Mumbai");
  });
});
