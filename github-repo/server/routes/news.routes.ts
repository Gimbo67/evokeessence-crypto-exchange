
import type { Express } from "express";

export function registerNewsRoutes(app: Express) {
  // News API endpoint
  app.get("/api/news", async (_req, res) => {
    try {
      // Fallback news data
      const newsItems = [
        {
          id: 1,
          title: "Bitcoin Breaks New All-Time High",
          content: "Bitcoin has reached a new all-time high surpassing previous records.",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          category: "market"
        },
        {
          id: 2,
          title: "New Regulations Coming for Crypto Exchanges",
          content: "Regulatory bodies are preparing new guidelines for cryptocurrency exchanges.",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          category: "regulation"
        },
        {
          id: 3,
          title: "Ethereum 2.0 Update Progress Report",
          content: "The Ethereum Foundation has published a new progress report on the upcoming 2.0 update.",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: "technology"
        }
      ];
      
      console.log('Returning news data');
      res.json(newsItems);
    } catch (error) {
      console.error('Error in news endpoint:', error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });
}
