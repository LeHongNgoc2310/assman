export type BrokerType = string;
export type SubAccountType = 'THUONG' | 'MARGIN' | 'PHAI_SINH' | 'TRAI_PHIEU';

export interface ManualTransaction {
  id: string;
  accountId: string; // FK -> BrokerageAccount
  type: 'BUY' | 'SELL';
  symbol: string;
  quantity: number;
  price: number;
  feeRate: number;      // % fee rate, e.g. 0.15 for 0.15%
  feeAmount: number;    // calculated fee in VND
  taxRate: number;      // % tax rate, e.g. 0.1 for 0.1%
  taxAmount: number;    // calculated tax in VND
  netAmount: number;    // Net flow: negative for BUY, positive for SELL
  realizedPnL: number;  // 0 for BUY, actual realized gain/loss for SELL
  tradeDate: string;    // yyyy-mm-dd
  note: string;
  confirmedAt: string;  // Server/ISO timestamp
  createdAt: string;    // Client/ISO timestamp
}

export interface BrokerageAccount {
  id: string;
  name: string;
  broker: BrokerType;
  cashBalance: number;
  lastImportedAt?: string;
  color: string;
  
  // SubAccount extensions:
  subAccountType?: SubAccountType; // THUONG / MARGIN / PHAI_SINH / TRAI_PHIEU
  feeRate?: number;                // e.g. 0.15 for 0.15%
  taxRate?: number;                // e.g. 0.1 for 0.1%, locked
  isInitialLoaded?: boolean;       // OCR/Excel/Manual list imported exactly once
  transactions?: ManualTransaction[];
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
