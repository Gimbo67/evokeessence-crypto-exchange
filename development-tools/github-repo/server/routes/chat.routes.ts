import type { Express } from "express";
import { z } from "zod";
import { generateChatResponse } from "../utils/chat.utils";
import { validateApiKey } from "../utils/auth.utils";

export function registerChatRoutes(app: Express) {
  // Test endpoint for chat service
  app.get("/api/chat/test", async (_req, res) => {
    try {
      if (!process.env.PERPLEXITY_API_KEY) {
        return res.status(500).json({
          status: "error",
          message: "Chat service is not configured"
        });
      }

      const isValid = await validateApiKey();
      if (!isValid) {
        return res.status(500).json({
          status: "error",
          message: "Chat service configuration is invalid"
        });
      }

      const response = await generateChatResponse([
        { role: "user", content: "What services does EvokeEssence offer?" }
      ]);
      res.json({ status: "ok", message: response });
    } catch (error: any) {
      console.error('Chat test error:', error);
      res.status(500).json({
        status: "error",
        message: error.message
      });
    }
  });

  // Chat endpoint with improved error handling
  app.post("/api/chat", async (req, res) => {
    try {
      const messageSchema = z.object({
        content: z.string().min(1),
        sessionId: z.string(),
        metadata: z.record(z.any()).optional(),
      });

      const result = messageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid message format: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { content, sessionId, metadata } = result.data;
      const userId = req.user?.id;

      try {
        if (!process.env.PERPLEXITY_API_KEY) {
          return res.status(503).json({
            message: "Chat service is temporarily unavailable."
          });
        }

        const isValid = await validateApiKey();
        if (!isValid) {
          return res.status(503).json({
            message: "Chat service is temporarily unavailable."
          });
        }

        const response = await generateChatResponse(
          [{ role: "user", content }],
          sessionId,
          userId,
          metadata
        );

        res.json({ message: response });
      } catch (error: any) {
        console.error('Chat generation error:', error);

        if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
          return res.status(503).json({
            message: "Unable to connect to chat service. Please try again later."
          });
        }

        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          return res.status(504).json({
            message: "Request timed out. Please try again."
          });
        }

        res.status(500).json({
          message: "An error occurred while processing your message. Please try again."
        });
      }
    } catch (error: any) {
      console.error('Chat request error:', error);
      res.status(500).json({
        message: "Failed to process chat request"
      });
    }
  });
}