import { Plugin, Provider } from '@elizaos/core';
import axios from 'axios';
import schedule from 'node-schedule';

interface CryptoData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface MarketIndicators {
  btcDominance: number;
  totalMarketCap: number;
  fearGreedIndex?: number;
}

class CryptoDataProvider implements Provider {
  private cryptoData: Map<string, CryptoData> = new Map();
  private marketIndicators: MarketIndicators | null = null;
  private job: schedule.Job;

  constructor() {
    this.job = schedule.scheduleJob('*/5 * * * *', async () => {
      await this.updateData();
    });
  }

  async get(): Promise<any> {
    return {
      cryptoPrices: Object.fromEntries(this.cryptoData),
      marketIndicators: this.marketIndicators,
      lastUpdate: new Date().toISOString(),
    };
  }

  private async updateData(): Promise<void> {
    try {
      // Fetch data from CoinGecko API
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'bitcoin,ethereum,solana',
            vs_currencies: 'usd',
            include_24hr_vol: true,
            include_24hr_change: true,
          },
        }
      );

      const data = response.data;
      
      this.cryptoData.set('BTC', {
        symbol: 'BTC',
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change,
        volume24h: data.bitcoin.usd_24h_vol,
      });

      this.cryptoData.set('ETH', {
        symbol: 'ETH',
        price: data.ethereum.usd,
        change24h: data.ethereum.usd_24h_change,
        volume24h: data.ethereum.usd_24h_vol,
      });

      this.cryptoData.set('SOL', {
        symbol: 'SOL',
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change,
        volume24h: data.solana.usd_24h_vol,
      });

      // Fetch market indicators
      const globalData = await axios.get(
        'https://api.coingecko.com/api/v3/global'
      );
      
      this.marketIndicators = {
        btcDominance: globalData.data.data.bitcoin_dominance,
        totalMarketCap: globalData.data.data.total_market_cap.usd,
      };
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    }
  }

  cleanup(): void {
    this.job.cancel();
  }
}

const cryptoPlugin: Plugin = {
  name: 'crypto',
  description: 'Real-time cryptocurrency market data provider',
  providers: [new CryptoDataProvider()]
};

export default cryptoPlugin; 