import React, { useState, useEffect, useRef } from 'react';
import { BrokerageAccount, PortfolioPosition, AlertRule, AlertNotification, MarketAsset, ImportHistoryItem, MarketIndex, ManualTransaction } from './types';
import { initialDemoAccounts, initialDemoPositions, consolidatePositions } from './utils';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import AccountsTab from './components/AccountsTab';
import ImportDataTab from './components/ImportDataTab';
import DetailedPnLTab from './components/DetailedPnLTab';
import RiskAlertsTab from './components/RiskAlertsTab';
import PerformanceTab from './components/PerformanceTab';
import AuthModal from './components/AuthModal';
import { 
  PieChart, 
  Landmark, 
  Download, 
  BarChart2, 
  ShieldAlert, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  Wallet,
  BookOpen,
  CheckCircle2,
  Sparkles,
  X,
  ExternalLink,
  Undo
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'import' | 'pnl' | 'risk' | 'performance'>('dashboard');
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const navTrackRef = React.useRef<HTMLDivElement>(null);

  // Trigger scrolling state and position monitoring
  useEffect(() => {
    const track = navTrackRef.current;
    if (!track) return;

    const handleScroll = () => {
      setShowLeftArrow(track.scrollLeft > 10);
      setShowRightArrow(track.scrollLeft < track.scrollWidth - track.clientWidth - 12);
    };

    handleScroll();
    track.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    const timer = setTimeout(handleScroll, 300);

    return () => {
      track.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timer);
    };
  }, [activeTab]);

  // Auto-scroll selected tab into view on mobile scrollable rail
  useEffect(() => {
    const el = document.getElementById(`nav-tab-${activeTab}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // Auth States
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Load auth session on boot
  useEffect(() => {
    const savedUser = localStorage.getItem('assman_current_user');
    const savedGuest = localStorage.getItem('assman_is_guest');
    if (savedUser) {
      setCurrentUser(savedUser);
      setIsGuest(false);
    } else if (savedGuest === 'true') {
      setCurrentUser('Khách');
      setIsGuest(true);
    } else {
      // Default to guest to skip prompting forever, but show dialog initially
      setCurrentUser(null);
      setIsGuest(false);
    }
  }, []);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    setIsGuest(false);
    setShowAuthModal(false);
    localStorage.setItem('assman_current_user', username);
    localStorage.removeItem('assman_is_guest');
  };

  const handleGuestAccess = () => {
    setCurrentUser('Khách');
    setIsGuest(true);
    setShowAuthModal(false);
    localStorage.setItem('assman_is_guest', 'true');
    localStorage.removeItem('assman_current_user');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuest(false);
    setShowAuthModal(true);
    localStorage.removeItem('assman_current_user');
    localStorage.removeItem('assman_is_guest');
  };

  const showGate = (!currentUser && !isGuest) || showAuthModal;

  // Core States
  const [accounts, setAccounts] = useState<BrokerageAccount[]>([]);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [historyItems, setHistoryItems] = useState<ImportHistoryItem[]>([]);
  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [marketDataSource, setMarketDataSource] = useState<string>("Simulation");
  const [marketDiagnostics, setMarketDiagnostics] = useState<any>(null);

  // State trackers for uploaded positions, automatic broker filters, and success message toast
  const [successToast, setSuccessToast] = useState<{
    message: string;
    brokerName: string;
    accountId: string;
    count: number;
  } | null>(null);

  const [importUndoData, setImportUndoData] = useState<{
    positions: PortfolioPosition[];
    accounts: BrokerageAccount[];
    historyItems: ImportHistoryItem[];
  } | null>(null);

  const [recentlyAddedSymbols, setRecentlyAddedSymbols] = useState<string[]>([]);
  const [recentlyImportedBroker, setRecentlyImportedBroker] = useState<string>('ALL');
  const [hasUnseenImport, setHasUnseenImport] = useState<boolean>(false);
  const [undoToastVisible, setUndoToastVisible] = useState<boolean>(false);

  // Auto-hide the Undo confirmation message after a few seconds
  useEffect(() => {
    if (undoToastVisible) {
      const timer = setTimeout(() => {
        setUndoToastVisible(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [undoToastVisible]);

  const hasViewedSymbolsRef = useRef<boolean>(false);

  // Clear specific "NEW" stock symbol badges when active tab changes after being viewed
  useEffect(() => {
    if (recentlyAddedSymbols.length > 0) {
      const isViewingTab = activeTab === 'dashboard' || activeTab === 'pnl';
      if (isViewingTab) {
        if (hasViewedSymbolsRef.current) {
          // If we had already flagged it as viewed in a viewing tab, and we transition/switch tab, clear it
          setRecentlyAddedSymbols([]);
          hasViewedSymbolsRef.current = false;
        } else {
          // First time entering a viewing tab, flag it as viewed
          hasViewedSymbolsRef.current = true;
        }
      } else {
        // If we are on some other tab, and we have already viewed them, clear them
        if (hasViewedSymbolsRef.current) {
          setRecentlyAddedSymbols([]);
          hasViewedSymbolsRef.current = false;
        }
      }
    }
  }, [activeTab, recentlyAddedSymbols]);

  // When new symbols are imported, reset the viewed flag
  useEffect(() => {
    if (recentlyAddedSymbols.length > 0) {
      const isViewingTab = activeTab === 'dashboard' || activeTab === 'pnl';
      hasViewedSymbolsRef.current = isViewingTab;
    } else {
      hasViewedSymbolsRef.current = false;
    }
  }, [recentlyAddedSymbols, activeTab]);

  // Telemetry details
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isSimulatingPrice, setIsSimulatingPrice] = useState(false);
  const [priceServiceError, setPriceServiceError] = useState(false);

  // Initialize States from LocalStorage or falling back to premium Vietnamese data
  useEffect(() => {
    // 1. Broker accounts
    const savedAccounts = localStorage.getItem('assman_accounts');
    let loadedAccounts: BrokerageAccount[] = [];
    if (savedAccounts) {
      loadedAccounts = JSON.parse(savedAccounts);
    } else {
      loadedAccounts = initialDemoAccounts;
      localStorage.setItem('assman_accounts', JSON.stringify(loadedAccounts));
    }
    setAccounts(loadedAccounts);

    // 2. Positions
    const savedPositions = localStorage.getItem('assman_positions');
    let loadedPositions: PortfolioPosition[] = [];
    if (savedPositions) {
      loadedPositions = JSON.parse(savedPositions);
    } else {
      loadedPositions = initialDemoPositions(loadedAccounts);
      localStorage.setItem('assman_positions', JSON.stringify(loadedPositions));
    }
    setPositions(loadedPositions);

    // 3. Alert concentration rules
    const savedRules = localStorage.getItem('assman_rules');
    let loadedRules: AlertRule[] = [];
    if (savedRules) {
      loadedRules = JSON.parse(savedRules);
    } else {
      loadedRules = [
        { id: 'rule-fpt', type: 'CONCENTRATION', stockSymbol: 'FPT', thresholdPercent: 25, isActive: true },
        { id: 'rule-hpg', type: 'CONCENTRATION', stockSymbol: 'HPG', thresholdPercent: 15, isActive: true },
        { id: 'rule-vnm', type: 'CONCENTRATION', stockSymbol: 'VNM', thresholdPercent: 15, isActive: false }
      ];
      localStorage.setItem('assman_rules', JSON.stringify(loadedRules));
    }
    setRules(loadedRules);

    // 4. Notifications
    const savedNotifs = localStorage.getItem('assman_notifications');
    if (savedNotifs) {
      setNotifications(JSON.parse(savedNotifs));
    }

    // 5. Import History Log
    const savedHistory = localStorage.getItem('assman_history');
    if (savedHistory) {
      setHistoryItems(JSON.parse(savedHistory));
    } else {
      const demoHistory: ImportHistoryItem[] = [
        {
          id: 'hist-1',
          fileName: 'pinetree_sao_ke_2026.xlsx',
          accountId: 'acc-3',
          timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          status: 'Completed',
          importedCount: 2,
          failedCount: 0
        }
      ];
      setHistoryItems(demoHistory);
      localStorage.setItem('assman_history', JSON.stringify(demoHistory));
    }
  }, []);

  // Fetch VN Stock market data feed from our Express backend
  const fetchMarketQuotes = async (force: boolean = false) => {
    setIsSimulatingPrice(true);
    try {
      const response = await fetch(force ? '/api/market-data?force=true' : '/api/market-data');
      if (!response.ok) {
        throw new Error("Mất kết nối với máy chủ VN Stock.");
      }
      const rawData = await response.json();
      const assetsList = rawData.assets || rawData;
      setMarketAssets(assetsList);
      if (rawData.indices) {
        setMarketIndices(rawData.indices);
      } else {
        // Fallback local indices in case server doesn't return them
        setMarketIndices([
          { symbol: "VNINDEX", name: "VN-Index", price: 1285.50, prevClose: 1281.00, change: 4.50, changePercent: 0.35 },
          { symbol: "VN30", name: "VN30", price: 1292.15, prevClose: 1288.50, change: 3.65, changePercent: 0.28 },
          { symbol: "HNX", name: "HNX-Index", price: 243.20, prevClose: 244.10, change: -0.90, changePercent: -0.37 },
          { symbol: "UPCOM", name: "UPCoM-Index", price: 95.80, prevClose: 95.55, change: 0.25, changePercent: 0.26 }
        ]);
      }
      setIsRealtimeActive(!!rawData.realtimeActive);
      setMarketDataSource(rawData.source || "Simulation");
      setMarketDiagnostics(rawData.diagnostics);
      setPriceServiceError(false);
      setLastRefreshTime(new Date());

      // Update positions' currentPrice state recursively based on new ticks!
      setPositions(prevPositions => {
        const updated = prevPositions.map(pos => {
          const matchQuote = assetsList.find((ma: any) => ma.symbol === pos.stockSymbol);
          if (matchQuote) {
            return {
              ...pos,
              currentPrice: matchQuote.price,
              updatedAt: new Date().toISOString()
            };
          }
          return pos;
        });
        localStorage.setItem('assman_positions', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      console.warn("⚠️ Price Data Service gián đoạn: Dùng dữ liệu giá dự phòng.", err);
      setPriceServiceError(true);
      setIsRealtimeActive(false);
      setMarketDataSource("Simulation fallback");
      
      // Seed initial local simulated fallback assets if request fails
      if (marketAssets.length === 0) {
        setMarketAssets([
          { symbol: "FPT", name: "CTCP FPT", price: 135200, prevClose: 133500, change: 1700, changePercent: 1.27, type: "EQUITY" },
          { symbol: "HPG", name: "CTCP Tập đoàn Hòa Phát", price: 28500, prevClose: 28100, change: 400, changePercent: 1.42, type: "EQUITY" },
          { symbol: "VNM", name: "CTCP Sữa Việt Nam (Vinamilk)", price: 66500, prevClose: 66800, change: -300, changePercent: -0.45, type: "EQUITY" },
          { symbol: "E1VFVN30", name: "Chứng chỉ Quỹ ETF VFMVN30", price: 22100, prevClose: 22000, change: 100, changePercent: 0.45, type: "ETF" },
          { symbol: "FUEVFVND", name: "Chứng chỉ Quỹ ETF DCVFMVN DIAMOND", price: 31500, prevClose: 31400, change: 100, changePercent: 0.32, type: "ETF" },
          { symbol: "VN30F1M", name: "Hợp đồng Tương lai VN30", price: 1285.5, prevClose: 1281.0, change: 4.5, changePercent: 0.35, type: "DERIVATIVE" }
        ]);
      }
      if (marketIndices.length === 0) {
        setMarketIndices([
          { symbol: "VNINDEX", name: "VN-Index", price: 1285.50, prevClose: 1281.00, change: 4.50, changePercent: 0.35 },
          { symbol: "VN30", name: "VN30", price: 1292.15, prevClose: 1288.50, change: 3.65, changePercent: 0.28 },
          { symbol: "HNX", name: "HNX-Index", price: 243.20, prevClose: 244.10, change: -0.90, changePercent: -0.37 },
          { symbol: "UPCOM", name: "UPCoM-Index", price: 95.80, prevClose: 95.55, change: 0.25, changePercent: 0.26 }
        ]);
      }
    } finally {
      setIsSimulatingPrice(false);
    }
  };

  // Mount market interval update loop
  useEffect(() => {
    fetchMarketQuotes();
    // Auto-refresh interval of 15 seconds inside trading simulation as per guidelines
    const interval = setInterval(fetchMarketQuotes, 15000);
    return () => clearInterval(interval);
  }, [positions.length, accounts.length]);

  // Evaluates risk alerting boundaries on each position weight shift
  useEffect(() => {
    if (positions.length === 0 || accounts.length === 0 || rules.length === 0) return;

    const consolidated = consolidatePositions(positions, accounts);
    const totalCash = accounts.reduce((acc, curr) => acc + curr.cashBalance, 0);
    const totalStockMarket = consolidated.reduce((acc, curr) => acc + curr.totalMarketValue, 0);
    const totalNAV = totalStockMarket + totalCash;

    if (totalNAV <= 0) return;

    rules.forEach(rule => {
      if (!rule.isActive) return;

      const matchingHolding = consolidated.find(c => c.stockSymbol === rule.stockSymbol);
      const symbolWeight = matchingHolding ? (matchingHolding.totalMarketValue / totalNAV) * 100 : 0;

      // Active compliance violation alert trigger!
      if (symbolWeight > rule.thresholdPercent) {
        // Evaluate if we already trigger this matching violation notification within standard session
        const alreadyExists = notifications.some(
          n => n.ruleId === rule.id && 
          new Date(n.timestamp).toDateString() === new Date().toDateString()
        );

        if (!alreadyExists) {
          const newNotif: AlertNotification = {
            id: `notif-${Date.now()}-${rule.stockSymbol}`,
            timestamp: new Date().toISOString(),
            ruleId: rule.id,
            title: `CẢNH BÁO TỶ TRỌNG: ${rule.stockSymbol} vượt ngưỡng an toàn!`,
            message: `Quy tắc giới hạn ${rule.thresholdPercent.toFixed(1)}% NAV. Tỷ trọng thực tế hiện tại tăng lên ${symbolWeight.toFixed(2)}%, điều chỉnh danh mục ngay để tối ưu hóa rủi ro tập trung.`,
            read: false
          };

          // Update state and persistence
          setNotifications(prev => {
            const updated = [newNotif, ...prev];
            localStorage.setItem('assman_notifications', JSON.stringify(updated));
            return updated;
          });

          // update last triggered timestamp on the rule itself
          setRules(prevRules => {
            const updated = prevRules.map(r => r.id === rule.id ? { ...r, lastTriggeredAt: new Date().toISOString() } : r);
            localStorage.setItem('assman_rules', JSON.stringify(updated));
            return updated;
          });
        }
      }
    });

  }, [positions, rules, accounts]);

  // State modifying Handlers:

  // 1. BROKER ACCOUNTS MANAGEMENT
  const handleAddAccount = (accData: Omit<BrokerageAccount, 'id'>) => {
    const newAcc: BrokerageAccount = {
      ...accData,
      id: `acc-${Date.now()}`
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem('assman_accounts', JSON.stringify(updated));
  };

  const handleEditAccount = (id: string, updatedParams: Partial<BrokerageAccount>) => {
    const updated = accounts.map(a => a.id === id ? { ...a, ...updatedParams } : a);
    setAccounts(updated);
    localStorage.setItem('assman_accounts', JSON.stringify(updated));
  };

  const handleDeleteAccount = (id: string) => {
    // Cascade delete positions linked to this broker account
    const updatedPos = positions.filter(p => p.accountId !== id);
    setPositions(updatedPos);
    localStorage.setItem('assman_positions', JSON.stringify(updatedPos));

    const updatedAcc = accounts.filter(a => a.id !== id);
    setAccounts(updatedAcc);
    localStorage.setItem('assman_accounts', JSON.stringify(updatedAcc));
  };

  // 2. POSITION DATA INGESTION
  const handleImportPositions = (
    accountId: string, 
    newPositions: Omit<PortfolioPosition, 'id' | 'currentPrice' | 'updatedAt'>[], 
    mode: 'add' | 'overwrite'
  ) => {
    // Save snapshot of positions, accounts, history for undo functionality
    setImportUndoData({
      positions: [...positions],
      accounts: [...accounts],
      historyItems: [...historyItems],
    });

    // Refresh date timestamp on account
    const updatedAccounts = accounts.map(a => a.id === accountId ? { ...a, lastImportedAt: new Date().toISOString() } : a);
    setAccounts(updatedAccounts);
    localStorage.setItem('assman_accounts', JSON.stringify(updatedAccounts));

    // Track state of recently added items for the notification toast & 'NEW' badges & automatic broker filters
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setRecentlyImportedBroker(account.broker);
      const importedSymbols = newPositions.map(p => p.stockSymbol.toUpperCase());
      setRecentlyAddedSymbols(importedSymbols);
      setHasUnseenImport(true);
      
      setSuccessToast({
        message: `Đã nạp thành công ${importedSymbols.length} vị thế đầu tư vào tài khoản của bạn tại ${account.broker}!`,
        brokerName: account.broker,
        accountId: accountId,
        count: importedSymbols.length
      });
    }

    let updatedPos: PortfolioPosition[] = [];
    
    if (mode === 'overwrite') {
      // Keep other accounts' positions, purge this account's historical lines
      const otherAccountsPos = positions.filter(p => p.accountId !== accountId);
      
      const newlyCreated: PortfolioPosition[] = newPositions.map(p => {
        // Cross join with current market symbol price fallback
        const marketPriceObj = marketAssets.find(ma => ma.symbol === p.stockSymbol);
        const latestPrice = marketPriceObj ? marketPriceObj.price : p.averageCostPrice;

        return {
          ...p,
          id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          accountId,
          currentPrice: latestPrice,
          updatedAt: new Date().toISOString()
        };
      });

      updatedPos = [...otherAccountsPos, ...newlyCreated];
    } else {
      // Add or merge quantities securely
      const basePosMap = [...positions];

      newPositions.forEach(newP => {
        const index = basePosMap.findIndex(curr => curr.accountId === accountId && curr.stockSymbol === newP.stockSymbol);
        const marketPriceObj = marketAssets.find(ma => ma.symbol === newP.stockSymbol);
        const latestPrice = marketPriceObj ? marketPriceObj.price : newP.averageCostPrice;

        if (index !== -1) {
          // Merge identical positions
          const existing = basePosMap[index];
          const totalQty = existing.quantity + newP.quantity;
          
          let totalCost = 0;
          if (existing.assetType === 'DERIVATIVE') {
            totalCost = (existing.quantity * existing.averageCostPrice * 100000) + (newP.quantity * newP.averageCostPrice * 100000);
            existing.averageCostPrice = totalQty > 0 ? (totalCost / 100000) / totalQty : 0;
          } else {
            totalCost = (existing.quantity * existing.averageCostPrice) + (newP.quantity * newP.averageCostPrice);
            existing.averageCostPrice = totalQty > 0 ? totalCost / totalQty : 0;
          }

          existing.quantity = totalQty;
          existing.currentPrice = latestPrice;
          existing.updatedAt = new Date().toISOString();
        } else {
          // Push new standalone line
          basePosMap.push({
            ...newP,
            id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            accountId,
            currentPrice: latestPrice,
            updatedAt: new Date().toISOString()
          });
        }
      });

      updatedPos = basePosMap;
    }

    setPositions(updatedPos);
    localStorage.setItem('assman_positions', JSON.stringify(updatedPos));
  };

  // Modify individual draft or missing buy cost basis
  const handleUpdateCostPrice = (accountId: string, symbol: string, currentPrice: number) => {
    const updated = positions.map(pos => {
      if (pos.accountId === accountId && pos.stockSymbol === symbol) {
        return {
          ...pos,
          averageCostPrice: currentPrice,
          updatedAt: new Date().toISOString()
        };
      }
      return pos;
    });
    setPositions(updated);
    localStorage.setItem('assman_positions', JSON.stringify(updated));
  };

  // Record manual Buy/Sell transactions with dynamic WAC calculation and Cash adjustment
  const handleRecordManualTransaction = (
    accountId: string, 
    tx: Omit<ManualTransaction, 'id' | 'accountId' | 'confirmedAt' | 'createdAt'>
  ) => {
    const isSell = tx.type === 'SELL';
    
    // Create new immutable transaction entry
    const freshTx: ManualTransaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      accountId,
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 1. Adjust cash balance and append transaction logs in BrokerageAccount
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === accountId) {
        const prevTxs = acc.transactions || [];
        const newCash = acc.cashBalance + freshTx.netAmount;
        return {
          ...acc,
          cashBalance: newCash,
          transactions: [...prevTxs, freshTx],
          isInitialLoaded: true, // Any transaction recorded marks the sub-account as initialized
          lastImportedAt: new Date().toISOString()
        };
      }
      return acc;
    });

    setAccounts(updatedAccounts);
    localStorage.setItem('assman_accounts', JSON.stringify(updatedAccounts));

    // 2. Adjust or clear holding position (PortfolioPosition)
    const targetAccount = accounts.find(a => a.id === accountId);
    if (!targetAccount) return;

    const subAccType = targetAccount.subAccountType || 'THUONG';
    const assetType = subAccType === 'PHAI_SINH' ? 'DERIVATIVE' : subAccType === 'TRAI_PHIEU' ? 'ETF' : 'EQUITY'; 
    const multiplier = assetType === 'DERIVATIVE' ? 100000 : 1;

    // Search existing holding for this symbol in this account
    const existingIndex = positions.findIndex(
      p => p.accountId === accountId && p.stockSymbol.toUpperCase() === freshTx.symbol.toUpperCase()
    );

    let updatedPos = [...positions];

    if (!isSell) {
      // BUY: Add to existing holding or create brand-new position
      if (existingIndex !== -1) {
        const existing = updatedPos[existingIndex];
        const oldQty = existing.quantity;
        const oldAvg = existing.averageCostPrice;
        const addQty = freshTx.quantity;
        const addPrice = freshTx.price;

        // Formula BR-002: new_total_cost = old_total_cost + (buy_quantity × price) + fee_amount
        const oldTotalCostVal = oldQty * oldAvg * multiplier;
        const buyCostVal = (addQty * addPrice * multiplier) + freshTx.feeAmount;
        
        const totalQty = oldQty + addQty;
        const totalCostVal = oldTotalCostVal + buyCostVal;
        
        const newAvg = totalQty > 0 ? (totalCostVal / multiplier) / totalQty : 0;

        updatedPos[existingIndex] = {
          ...existing,
          quantity: totalQty,
          averageCostPrice: newAvg,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Create new position line
        const marketPriceObj = marketAssets.find(ma => ma.symbol === freshTx.symbol.toUpperCase());
        const latestPrice = marketPriceObj ? marketPriceObj.price : freshTx.price;

        const totalCostVal = (freshTx.quantity * freshTx.price * multiplier) + freshTx.feeAmount;
        const avg = freshTx.quantity > 0 ? (totalCostVal / multiplier) / freshTx.quantity : 0;

        updatedPos.push({
          id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          accountId,
          stockSymbol: freshTx.symbol.toUpperCase(),
          quantity: freshTx.quantity,
          averageCostPrice: avg,
          currentPrice: latestPrice,
          assetType,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      // SELL: Deduct from holding
      if (existingIndex !== -1) {
        const existing = updatedPos[existingIndex];
        const newQty = existing.quantity - freshTx.quantity;

        if (newQty <= 0) {
          // Rule BR-002: holding is wiped if qty drops to 0
          updatedPos.splice(existingIndex, 1);
        } else {
          updatedPos[existingIndex] = {
            ...existing,
            quantity: newQty,
            updatedAt: new Date().toISOString()
          };
        }
      }
    }

    setPositions(updatedPos);
    localStorage.setItem('assman_positions', JSON.stringify(updatedPos));
  };

  // Clear specific "NEW" stock symbol badge when viewed/clicked by user
  const handleSeenSymbol = (symbol: string) => {
    setRecentlyAddedSymbols(prev => prev.filter(s => s !== symbol.toUpperCase()));
  };

  // Revert last import to prevent errors/wrong brokerage selection
  const handleUndoImport = () => {
    if (importUndoData) {
      setPositions(importUndoData.positions);
      setAccounts(importUndoData.accounts);
      setHistoryItems(importUndoData.historyItems);

      localStorage.setItem('assman_positions', JSON.stringify(importUndoData.positions));
      localStorage.setItem('assman_accounts', JSON.stringify(importUndoData.accounts));
      localStorage.setItem('assman_history', JSON.stringify(importUndoData.historyItems));

      setImportUndoData(null);
      setRecentlyAddedSymbols([]);
      setSuccessToast(null);
      setUndoToastVisible(true);
    }
  };

  // 3. RISK ALERT CONCENTRATION RULES
  const handleAddRule = (ruleData: Omit<AlertRule, 'id' | 'isActive'>) => {
    const newRule: AlertRule = {
      ...ruleData,
      id: `rule-${Date.now()}`,
      isActive: true
    };
    const updated = [...rules, newRule];
    setRules(updated);
    localStorage.setItem('assman_rules', JSON.stringify(updated));
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    setRules(updated);
    localStorage.setItem('assman_rules', JSON.stringify(updated));
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    localStorage.setItem('assman_rules', JSON.stringify(updated));
  };

  // 4. ALERTS NOTIFICATIONS PANEL
  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('assman_notifications', JSON.stringify(updated));
  };

  const handleAddHistoryItem = (history: Omit<ImportHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: ImportHistoryItem = {
      ...history,
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newItem, ...historyItems];
    setHistoryItems(updated);
    localStorage.setItem('assman_history', JSON.stringify(updated));
  };

  // Compute aggregate numbers
  const consolidatedPosList = consolidatePositions(positions, accounts);
  const totalCashBalance = accounts.reduce((sum, item) => sum + item.cashBalance, 0);
  const totalHoldingsMkt = consolidatedPosList.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const aggregatedNAV = totalHoldingsMkt + totalCashBalance;

  // Calculate day P&L change
  let calculatedDailyPL = 0;
  consolidatedPosList.forEach(pos => {
    const marketAsset = marketAssets.find(ma => ma.symbol === pos.stockSymbol);
    if (marketAsset) {
      if (pos.assetType === 'DERIVATIVE') {
        calculatedDailyPL += pos.totalQuantity * marketAsset.change * 100000;
      } else {
        calculatedDailyPL += pos.totalQuantity * marketAsset.change;
      }
    }
  });
  const calculatedDailyPLPercent = (aggregatedNAV - calculatedDailyPL) > 0 
    ? (calculatedDailyPL / (aggregatedNAV - calculatedDailyPL)) * 100 
    : 0;

  // Calculate Stale records warning (last imported date is not populated or > 7 days ago)
  const calculateStaleStatus = (): number => {
    let count = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    accounts.forEach(acc => {
      if (acc.lastImportedAt) {
        const importDate = new Date(acc.lastImportedAt);
        if (importDate < sevenDaysAgo) {
          count++;
        }
      } else {
        count++; // Stale because it doesn't has positions synchronised yet!
      }
    });
    return count;
  };

  const staleCount = calculateStaleStatus();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-350">
      
      {/* 2. Authentication modal overlay gate */}
      {showGate && (
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          onGuestAccess={handleGuestAccess}
          onClose={() => setShowAuthModal(false)}
          canCloseWithoutLogin={!!currentUser || isGuest}
        />
      )}

      {/* Sticky Top-level Freeze Shell */}
      <div className={`${showGate ? 'relative' : 'sticky top-0 z-50'} flex flex-col w-full bg-[#09090b] shadow-sm`}>
        {/* 1. Brand header of the application */}
        <Header
          totalNAV={aggregatedNAV}
          dailyPL={calculatedDailyPL}
          dailyPLPercent={calculatedDailyPLPercent}
          isSimulating={isSimulatingPrice}
          onManualRefresh={() => fetchMarketQuotes(true)}
          lastRefreshTime={lastRefreshTime}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          currentUser={currentUser === 'Khách' ? null : currentUser}
          isGuestUser={isGuest || !currentUser}
          onLogout={handleLogout}
          onTriggerLogin={() => setShowAuthModal(true)}
          isRealtimeActive={isRealtimeActive}
          marketDataSource={marketDataSource}
          marketDiagnostics={marketDiagnostics}
          indices={marketIndices}
        />

        {/* 2. Primary Navigation rail */}
        <nav id="app-nav-bar" className="bg-[#09090b]/95 border-b border-zinc-805/50 backdrop-blur-md relative select-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            
            {/* Left fade-out block with animated arrow pointing left (shows when scrolled right, meaning left menu items are hidden) */}
            {showLeftArrow && (
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent pointer-events-none z-10 flex items-center justify-start pl-3 md:hidden animate-fade-in">
                <span className="text-emerald-400 font-black animate-pulse text-sm select-none">&larr;</span>
              </div>
            )}

            {/* Right fade-out block with animated arrow pointing right (shows when scrolled left, meaning right menu items are hidden) */}
            {showRightArrow && (
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#09090b] via-[#09090b]/80 to-transparent pointer-events-none z-10 flex items-center justify-end pr-3 md:hidden animate-fade-in">
                <span className="text-emerald-400 font-black animate-pulse text-sm select-none">&rarr;</span>
              </div>
            )}

            {/* Scrollable track containing tabs */}
            <div 
              ref={navTrackRef}
              className="flex space-x-7 h-12 overflow-x-auto whitespace-nowrap scrollbar-none items-center text-xs font-sans px-2 md:px-0 scroll-smooth"
            >
              
              <button
                id="nav-tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`py-3 px-1 inline-flex items-center space-x-1.5 border-b-2 font-bold cursor-pointer transition-all ${
                  activeTab === 'dashboard'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <PieChart className="h-4 w-4" />
                <span>Tổng Quan</span>
              </button>

              <button
                id="nav-tab-pnl"
                onClick={() => {
                  setActiveTab('pnl');
                  if (hasUnseenImport) {
                    setHasUnseenImport(false);
                  }
                  // Auto-dismiss the success toast if active when opening this tab
                  setSuccessToast(null);
                }}
                className={`py-3 px-1 inline-flex items-center space-x-1.5 border-b-2 font-bold cursor-pointer transition-all ${
                  activeTab === 'pnl'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                <span>Tài Sản & P&L Chi Tiết</span>
                {hasUnseenImport && (
                  <span className="bg-emerald-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full select-none animate-pulse shrink-0 tracking-wider font-mono">
                    NEW
                  </span>
                )}
              </button>

              <button
                id="nav-tab-performance"
                onClick={() => setActiveTab('performance')}
                className={`py-3 px-1 inline-flex items-center space-x-1.5 border-b-2 font-bold cursor-pointer transition-all ${
                  activeTab === 'performance'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Hiệu Suất Đầu Tư (TWR)</span>
              </button>

              <button
                id="nav-tab-risk"
                onClick={() => setActiveTab('risk')}
                className={`py-3 px-1 inline-flex items-center space-x-1.5 border-b-2 font-bold cursor-pointer transition-all ${
                  activeTab === 'risk'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Cảnh Báo Tỷ Trọng</span>
              </button>

              <button
                id="nav-tab-accounts"
                onClick={() => setActiveTab('accounts')}
                className={`py-3 px-1 inline-flex items-center space-x-1.5 border-b-2 font-bold cursor-pointer transition-all ${
                  activeTab === 'accounts'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Landmark className="h-4 w-4" />
                <span>Quản Lý CTCK ({accounts.length})</span>
              </button>

            </div>
          </div>
        </nav>
      </div>

      {/* 3. Main Workspace Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Exception alert: Price feed disruption banner */}
        {priceServiceError && (
          <div id="service-interruption-banner" className="mb-6 bg-amber-950/20 border border-amber-900/50 p-4 rounded-2xl flex items-center space-x-3 text-amber-300 animate-fade-in text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="font-semibold text-amber-100">
              Dữ liệu kết nối thị trường tạm thời chậm trễ do hạ tầng Vnstock. Đang sử dụng dữ liệu giá lưu trữ cục bộ bảo hiểm.
            </p>
          </div>
        )}

        {/* Dynamic render Tab content views */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardTab
              positions={positions}
              accounts={accounts}
              marketAssets={marketAssets}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
              staleCount={staleCount}
              newSymbols={recentlyAddedSymbols}
              onSeenSymbol={handleSeenSymbol}
            />
          )}

          {activeTab === 'pnl' && (
            <DetailedPnLTab
              positions={positions}
              accounts={accounts}
              onUpdateCostPrice={handleUpdateCostPrice}
              selectedBrokerFilter={recentlyImportedBroker}
              onBrokerFilterChange={setRecentlyImportedBroker}
              newSymbols={recentlyAddedSymbols}
              onSeenSymbol={handleSeenSymbol}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceTab
              positions={positions}
              accounts={accounts}
              marketAssets={marketAssets}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'risk' && (
            <RiskAlertsTab
              positions={positions}
              accounts={accounts}
              rules={rules}
              onAddRule={handleAddRule}
              onToggleRule={handleToggleRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              accounts={accounts}
              positions={positions}
              onAddAccount={handleAddAccount}
              onEditAccount={handleEditAccount}
              onDeleteAccount={handleDeleteAccount}
              onImportPositions={handleImportPositions}
              onAddHistoryItem={handleAddHistoryItem}
              onRecordManualTransaction={handleRecordManualTransaction}
            />
          )}
        </div>

      </main>

      {/* 4. Elegant Minimal Foot notes */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-6 text-center text-[10px] font-mono text-zinc-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Assetly Personal Asset Manager • MVP Release v1.0.4</p>
          <p className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Assetly Core Engine v1.0.0 (Read-Only)</span>
          </p>
        </div>
      </footer>

      {/* Dynamic completion shortcut toast layer */}
      {successToast && (
        <div id="import-success-toast" className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[455px] bg-zinc-950 border-2 border-emerald-500/80 rounded-2xl p-5 shadow-2xl shadow-emerald-500/10 z-[110] animate-fade-in divide-y divide-zinc-850">
          <div className="flex items-start justify-between pb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/15 border border-emerald-400/20 p-2 rounded-xl text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-extrabold text-zinc-100 flex items-center space-x-1">
                  <span>Nạp tài sản thành công!</span>
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1">{successToast.message}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSuccessToast(null);
                setImportUndoData(null);
              }}
              className="text-zinc-550 hover:text-zinc-350 p-1 bg-zinc-905 border border-zinc-800 rounded-lg transition shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-transparent">
            <span className="text-[10px] text-zinc-550 italic block font-sans">
              Định vị CTCK: <strong className="text-emerald-400 font-mono font-bold">{successToast.brokerName}</strong>
            </span>
            <div className="flex items-center justify-end space-x-2">
              {importUndoData && (
                <button
                  onClick={handleUndoImport}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-amber-500 hover:text-amber-400 font-extrabold text-[11px] rounded-lg transition flex items-center space-x-1 active:scale-95 cursor-pointer shadow-xs shrink-0"
                  title="Nhập nhầm CTCK hoặc sai tài khoản? Nhấn để loại bỏ đợt nạp này"
                >
                  <Undo className="h-3 w-3 shrink-0" />
                  <span>Hoàn tác (Undo)</span>
                </button>
              )}
              <button
                onClick={() => {
                  setRecentlyImportedBroker(successToast.brokerName);
                  setActiveTab('pnl');
                  setHasUnseenImport(false);
                  setSuccessToast(null);
                }}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-black font-extrabold text-[11px] rounded-lg transition flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer shrink-0"
              >
                <span>Xem danh mục</span>
                <ExternalLink className="h-3 w-3 inline-block" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Confirmation Message Toast Layer */}
      {undoToastVisible && (
        <div id="undo-success-toast" className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[420px] bg-zinc-950 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl shadow-amber-500/10 z-[110] animate-fade-in flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-500/15 border border-amber-400/20 p-2 rounded-xl text-amber-500 shrink-0">
              <Undo className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-extrabold text-zinc-100">
                Đã hoàn tác thành công!
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-relaxed">
                Bạn đã hoàn tác thao tác nạp và đồng bộ danh mục trước đó.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setUndoToastVisible(false)}
            className="text-zinc-550 hover:text-zinc-350 p-1 bg-zinc-905 border border-zinc-800 rounded-lg transition shrink-0 ml-3"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
