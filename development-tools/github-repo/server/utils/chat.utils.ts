import { z } from "zod";
import { db } from "@db";
import { chatHistory } from "@db/schema";

const systemMessage = {
  role: "system",
  content: "EvokeEssence chat assistant"
};

export async function generateChatResponse(
  messages: z.infer<typeof messageSchema>[],
  sessionId: string,
  userId?: number,
  metadata?: Record<string, any>
): Promise<string> {
  const userQuestion = messages[messages.length - 1].content;
  return findBestMatch(userQuestion);
}

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string()
});

function findBestMatch(question: string): string {
  const responses = {
    "how to buy usdt": "On EvokeEssence, you can buy USDT/EUR after completing KYC verification. Please contact support@evo-exchange.com for detailed instructions.",
    "what can i trade": "On EvokeEssence, you can trade BTC/EUR, ETH/EUR, and USDT/EUR pairs with a standard fee of 16%. Contact support@evo-exchange.com for assistance.",
    "how do i deposit": "On EvokeEssence, we accept SEPA transfers in EUR for deposits. Contact support@evo-exchange.com for deposit instructions."
  };

  question = question.toLowerCase().trim();
  return responses[question] || "On EvokeEssence, we offer SEPA transfers and trading of BTC/EUR, ETH/EUR, and USDT/EUR pairs. Contact support@evo-exchange.com for assistance.";
}

async function saveChatInteraction(
  sessionId: string,
  content: string,
  type: 'user' | 'bot',
  userId?: number,
  metadata: Record<string, any> = {}
) {
  try {
    await db.insert(chatHistory).values({
      sessionId,
      userId,
      messageContent: content,
      messageType: type,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error saving chat interaction:', error);
  }
}