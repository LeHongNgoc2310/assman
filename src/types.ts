export type BrokerType = string;

export interface BrokerageAccount {
  id: string;
  name: string;
  broker: BrokerType;
  cashBalance: number;
  lastImportedAt?: string;
  color: string;
}

export type AssetType = 'EQUITY' | 'ETF' | 'DERIVATIVE';

export interface PortfolioPosition {
  id: string;
  accountId: string;
  stockSymbol: string;
  quantity: number;
  averageCostPrice: number;
  currentPrice: number; // dynamically fetched or simulated from Vnstock/quotes
  assetType: AssetType;
  updatedAt: string;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number; // price change
  changePercent: number; // percentage change
  type: AssetType;
  sector?: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
}

export interface AlertRule {
  id: string;
  type: 'CONCENTRATION';
  stockSymbol: string;
  thresholdPercent: number; // e.g., 15 for 15%
  isActive: boolean;
  lastTriggeredAt?: string;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  ruleId: string;
  title: string;
  message: string;
  read: boolean;
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  accountId: string;
  timestamp: string;
  status: 'Completed' | 'Failed';
  importedCount: number;
  failedCount: number;
  errorLog?: string[];
}
