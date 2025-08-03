import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';

const MarketOverview = () => {
  const [prices, setPrices] = useState({
    btc: 0,
    eth: 0,
    usdt: 1
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/market/prices');
        if (!response.ok) throw new Error('Failed to fetch prices');
        const data = await response.json();
        setPrices({
          btc: data[0]?.price || 0,
          eth: data[1]?.price || 0,
          usdt: 1
        });
      } catch (error) {
        console.error('Error fetching prices:', error);
        // Use fallback values on error
        setPrices({
          btc: 39000,
          eth: 2200,
          usdt: 1
        });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 bg-background w-full">
      <Container className="mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Market Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(prices).map(([coin, price]) => (
            <Card key={coin}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold uppercase">{coin}/USD</span>
                  <span className="text-xl">${price.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default MarketOverview;