import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string()
});

type Message = z.infer<typeof messageSchema>;

export async function getPerplexityResponse(messages: Message[]): Promise<string> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a helpful customer support agent for EvokeEssence cryptocurrency exchange. Provide clear, concise answers about our services, trading, KYC process, and security measures. Be professional and focus on factual information."
          },
          ...messages
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error("Failed to get response from Perplexity API");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw error;
  }
}