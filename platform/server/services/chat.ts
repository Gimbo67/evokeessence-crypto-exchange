
import { z } from "zod";
import { db } from "@db";
import { chatHistory } from "@db/schema";

// Strict Q&A pairs with exact responses
const ALLOWED_RESPONSES = {
  "how to buy usdt": "On EvokeEssence, you can buy USDT/EUR after completing KYC verification. Please contact support@evo-exchange.com for detailed instructions.",
  "what can i trade": "On EvokeEssence, you can trade BTC/EUR, ETH/EUR, and USDT/EUR pairs with a standard fee of 16%. Contact support@evo-exchange.com for assistance.",
  "what are your fees": "On EvokeEssence, we charge a standard fee of 16% on all trades. Contact support@evo-exchange.com for assistance.",
  "how do i deposit": "On EvokeEssence, we accept SEPA transfers in EUR for deposits. Contact support@evo-exchange.com for deposit instructions.",
  "how to verify": "On EvokeEssence, KYC verification is required before trading. Contact support@evo-exchange.com to start the verification process.",
  "support contact": "On EvokeEssence, we provide support via email. Please contact support@evo-exchange.com for assistance."
};

const DEFAULT_RESPONSE = "On EvokeEssence, we offer SEPA transfers and trading of BTC/EUR, ETH/EUR, and USDT/EUR pairs. Contact support@evo-exchange.com for assistance.";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

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

function findBestMatch(question: string): string {
  question = question.toLowerCase().trim();
  
  // Try exact match first
  if (ALLOWED_RESPONSES[question]) {
    return ALLOWED_RESPONSES[question];
  }

  // Try to find a matching key based on keywords
  const keywords = question.split(/\s+/);
  for (const [key, response] of Object.entries(ALLOWED_RESPONSES)) {
    if (keywords.some(word => key.includes(word))) {
      return response;
    }
  }

  return DEFAULT_RESPONSE;
}

export async function generateChatResponse(
  messages: z.infer<typeof messageSchema>[],
  sessionId: string,
  userId?: number,
  metadata?: Record<string, any>
): Promise<string> {
  const userQuestion = messages[messages.length - 1].content;

  // Save user's message
  await saveChatInteraction(sessionId, userQuestion, 'user', userId, metadata);

  // Get strictly controlled response
  const response = findBestMatch(userQuestion);

  // Save bot's response
  await saveChatInteraction(sessionId, response, 'bot', userId, {
    ...metadata,
    responseType: 'static'
  });

  return response;
}
