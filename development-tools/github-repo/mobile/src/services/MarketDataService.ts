import { api } from '../api/apiClient';
import { API_CONFIG } from '../config/api';

/**
 * Interface for cryptocurrency data
 */
export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  imageUrl: string;
  marketCap?: number;
  volume24h?: number;
}

/**
 * Service to handle cryptocurrency market data
 */
class MarketDataService {
  /**
   * Fetch cryptocurrency prices from the API
   */
  async getCryptocurrencyPrices(): Promise<Cryptocurrency[]> {
    try {
      const response = await api.market.getPrices();
      return response.data.cryptocurrencies || [];
    } catch (error) {
      console.error('Failed to fetch cryptocurrency prices:', error);
      throw error;
    }
  }

  /**
   * Get details for a specific cryptocurrency
   */
  async getCryptocurrencyDetails(id: string): Promise<Cryptocurrency | null> {
    try {
      const response = await api.request({
        url: `${API_CONFIG.endpoints.market}/${id}`,
        method: 'GET',
      });
      return response as Cryptocurrency || null;
    } catch (error) {
      console.error(`Failed to fetch details for cryptocurrency ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get historical price data for a cryptocurrency
   */
  async getHistoricalPrices(id: string, timeframe: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    try {
      const response = await api.request({
        url: `${API_CONFIG.endpoints.market}/${id}/history`,
        method: 'GET',
        params: { timeframe },
      });
      return response || [];
    } catch (error) {
      console.error(`Failed to fetch historical prices for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate the value of a cryptocurrency amount in USD
   */
  calculateValue(amount: number, price: number): number {
    return amount * price;
  }
}

// Export a singleton instance
export default new MarketDataService();