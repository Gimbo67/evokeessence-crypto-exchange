import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useTranslations } from "@/lib/language-context";
import { MessageCircle, Loader2 } from "lucide-react";

type Message = {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    content: "Welcome to EvokeEssence support! How can I help you today?",
    isBot: true,
    timestamp: new Date(),
  },
];

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const t = useTranslations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const messageId = Date.now().toString();

      // Add user message
      setMessages(prev => [...prev, {
        id: messageId,
        content: input.trim(),
        isBot: false,
        timestamp: new Date()
      }]);
      setInput("");

      // Call support API
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: input.trim(),
          userId: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      // Add bot response
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: data.message,
        isBot: true,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-2 mb-8">
        <MessageCircle className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Support Chat</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isBot ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.isBot
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Send"
          )}
        </Button>
      </form>
    </div>
  );
}