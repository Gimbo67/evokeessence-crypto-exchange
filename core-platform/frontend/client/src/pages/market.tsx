import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

export default function MarketPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/market/prices');
        if (!response.ok) {
          throw new Error('Failed to fetch market data');
        }
        const data = await response.json();
        setPrices(data);
      } catch (error) {
        console.error('Error fetching market data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load market data. Please try again later.',
          variant: 'destructive',
        });
        // Fallback data
        setPrices([
          { symbol: 'BTC', price: 39000, change24h: 2.5 },
          { symbol: 'ETH', price: 2200, change24h: 1.8 },
          { symbol: 'USDT', price: 1, change24h: 0 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [toast]);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Cryptocurrency Market</h1>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {prices.map((coin) => (
            <Card key={coin.symbol}>
              <CardHeader>
                <CardTitle>{coin.symbol}/USD</CardTitle>
                <CardDescription>
                  24h Change: <span className={coin.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {coin.change24h >= 0 ? '+' : ''}{coin.change24h}%
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${coin.price.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="mt-12 bg-muted rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Market Information</h2>
        <p className="mb-4">
          Our platform provides real-time cryptocurrency market data from reliable sources.
          Prices are updated every minute to ensure you have the most current information.
        </p>
        <p>
          Please note that cryptocurrency prices can be volatile and may change rapidly.
          Always conduct your own research before making investment decisions.
        </p>
      </div>
    </div>
  );
}