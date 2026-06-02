import { PortfolioPosition, BrokerageAccount } from "./types";

// Format currency to VND standard: e.g. 1.250.000 ₫ or 100.000.000 VND
export function formatVND(value: number, showSymbol = true): string {
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.round(value));
  return showSymbol ? `${formatted} ₫` : formatted;
}

// Convert numbers of shares cleanly: e.g. 1,200
export function formatShares(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

// Format percent value: e.g. +1.45% or -0.5%
export function formatPercent(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

// Helper to calculate total position breakdown across accounts
export interface ConsolidateItem {
  stockSymbol: string;
  totalQuantity: number;
  weightedAvgPrice: number;
  currentPrice: number;
  totalCostValue: number;
  totalMarketValue: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPct: number;
  assetType: 'EQUITY' | 'ETF' | 'DERIVATIVE';
  accountsBreakdown: {
    accountId: string;
    accountName: string;
    brokerName: string;
    quantity: number;
    averageCostPrice: number;
    unrealizedPL: number;
    unrealizedPLPct: number;
  }[];
}

export function consolidatePositions(
  positions: PortfolioPosition[],
  accounts: BrokerageAccount[]
): ConsolidateItem[] {
  const mapSet = new Map<string, PortfolioPosition[]>();

  // Group by symbol
  positions.forEach(pos => {
    const symbol = pos.stockSymbol.toUpperCase();
    if (!mapSet.has(symbol)) {
      mapSet.set(symbol, []);
    }
    mapSet.get(symbol)!.push(pos);
  });

  const consolidated: ConsolidateItem[] = [];

  mapSet.forEach((posList, symbol) => {
    let totalQty = 0;
    let totalCost = 0;
    const currentPrice = posList[0].currentPrice;
    const assetType = posList[0].assetType;

    const breakdown = posList.map(p => {
      const acc = accounts.find(a => a.id === p.accountId);
      const accName = acc ? acc.name : "Tài khoản ẩn";
      const brokerName = acc ? acc.broker : "Khác";
      
      let costValue = p.quantity * p.averageCostPrice;
      let marketValue = 0;
      
      // Derivatives in Vietnam use 100.000 VND per index point multiplier!
      if (assetType === 'DERIVATIVE') {
        costValue = p.quantity * p.averageCostPrice * 100000;
        marketValue = p.quantity * p.currentPrice * 100000;
      } else {
        marketValue = p.quantity * p.currentPrice;
      }

      const unrealPL = marketValue - costValue;
      const unrealPLPct = costValue > 0 ? (unrealPL / costValue) * 100 : 0;

      totalQty += p.quantity;
      totalCost += costValue;

      return {
        accountId: p.accountId,
        accountName: accName,
        brokerName,
        quantity: p.quantity,
        averageCostPrice: p.averageCostPrice,
        unrealizedPL: unrealPL,
        unrealizedPLPct: unrealPLPct
      };
    });

    // Calculate weighted average price
    let weightedAvg = 0;
    if (assetType === 'DERIVATIVE') {
      weightedAvg = totalQty > 0 ? (totalCost / 100000) / totalQty : 0;
    } else {
      weightedAvg = totalQty > 0 ? totalCost / totalQty : 0;
    }

    let totalMkt = 0;
    if (assetType === 'DERIVATIVE') {
      totalMkt = totalQty * currentPrice * 100000;
    } else {
      totalMkt = totalQty * currentPrice;
    }

    const totalPL = totalMkt - totalCost;
    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    consolidated.push({
      stockSymbol: symbol,
      totalQuantity: totalQty,
      weightedAvgPrice: weightedAvg,
      currentPrice,
      totalCostValue: totalCost,
      totalMarketValue: totalMkt,
      totalUnrealizedPL: totalPL,
      totalUnrealizedPLPct: totalPLPct,
      assetType,
      accountsBreakdown: breakdown
    });
  });

  return consolidated;
}

// Prefilled demonstration state so the user can immediately play with a working app
export const initialDemoAccounts: BrokerageAccount[] = [
  { id: "acc-1", name: "Tích sản SSI", broker: "SSI", cashBalance: 45000000, lastImportedAt: "2026-05-28T07:12:00Z", color: "#E02424", subAccountType: "THUONG", feeRate: 0.15, taxRate: 0.1, isInitialLoaded: true, transactions: [] },
  { id: "acc-2", name: "Lướt sóng TCBS", broker: "TCBS", cashBalance: 12000000, lastImportedAt: "2026-05-27T10:30:00Z", color: "#3B82F6", subAccountType: "MARGIN", feeRate: 0.15, taxRate: 0.1, isInitialLoaded: true, transactions: [] },
  { id: "acc-3", name: "Khối Ngoại Pinetree", broker: "Pinetree", cashBalance: 8200000, lastImportedAt: "2026-05-28T06:00:00Z", color: "#10B981", subAccountType: "THUONG", feeRate: 0.10, taxRate: 0.1, isInitialLoaded: true, transactions: [] }
];

export const initialDemoPositions = (accounts: BrokerageAccount[]): PortfolioPosition[] => [
  {
    id: "pos-1",
    accountId: "acc-1",
    stockSymbol: "FPT",
    quantity: 500,
    averageCostPrice: 130000,
    currentPrice: 135200,
    assetType: "EQUITY",
    updatedAt: "2026-05-28T07:12:00Z"
  },
  {
    id: "pos-2",
    accountId: "acc-2", // FPT dual holding!
    stockSymbol: "FPT",
    quantity: 300,
    averageCostPrice: 132000,
    currentPrice: 135200,
    assetType: "EQUITY",
    updatedAt: "2026-05-27T10:30:00Z"
  },
  {
    id: "pos-3",
    accountId: "acc-1",
    stockSymbol: "HPG",
    quantity: 3000,
    averageCostPrice: 27200,
    currentPrice: 28500,
    assetType: "EQUITY",
    updatedAt: "2026-05-28T07:12:00Z"
  },
  {
    id: "pos-4",
    accountId: "acc-3",
    stockSymbol: "HPG", // HPG dual holding!
    quantity: 2000,
    averageCostPrice: 28900,
    currentPrice: 28500,
    assetType: "EQUITY",
    updatedAt: "2026-05-28T06:00:00Z"
  },
  {
    id: "pos-5",
    accountId: "acc-2",
    stockSymbol: "VNM",
    quantity: 1200,
    averageCostPrice: 68500,
    currentPrice: 66500,
    assetType: "EQUITY",
    updatedAt: "2026-05-27T10:30:00Z"
  },
  {
    id: "pos-6",
    accountId: "acc-3",
    stockSymbol: "FUEVFVND",
    quantity: 1500,
    averageCostPrice: 30200,
    currentPrice: 31500,
    assetType: "ETF",
    updatedAt: "2026-05-28T06:00:00Z"
  },
  {
    id: "pos-7",
    accountId: "acc-2",
    stockSymbol: "VN30F1M",
    quantity: 2,
    averageCostPrice: 1282.0,
    currentPrice: 1285.5,
    assetType: "DERIVATIVE",
    updatedAt: "2026-05-27T10:30:00Z"
  }
];

// Content templates for CSV/Excel copy-paste parsing demo
export const csvTemplates = {
  Pinetree: `Mã CK,Số lượng,Giá vốn TB
HPG,1000,27800
FPT,250,132000
VNM,500,66100
E1VFVN30,2000,21800`,
  SSI: `Mã chứng khoán,Số lượng sở hữu,Giá mua trung bình
FPT,600,129500
TCB,5000,23400
VIC,1500,43200`,
  General: `MaCK,SoLuong,GiaVon
HPG,1500,27100
VCB,800,90500
FPT,100,134000
VN30F1M,4,1280.0`
};
