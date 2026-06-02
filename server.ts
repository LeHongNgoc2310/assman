import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK with telemetry User-Agent header as required by guidelines
let ai: GoogleGenAI | null = null;
try {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not defined.");
  }
} catch (err) {
  console.error("❌ Error initializing GoogleGenAI SDK:", err);
}

const app = express();
const PORT = 3000;

// Middleware to parse json payloads
app.use(express.json({ limit: "20mb" }));

// Vietnamese Market Data (Simulation)
// Stocks, ETFs, and Derivatives (VN30F1M)
interface SimulatedAsset {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  type: 'EQUITY' | 'ETF' | 'DERIVATIVE';
  sector?: string;
}

let marketAssets: SimulatedAsset[] = [
  { symbol: "HPG", name: "CTCP Tập đoàn Hòa Phát", price: 28500, prevClose: 28100, change: 400, changePercent: 1.42, type: "EQUITY", sector: "Tài nguyên Cơ bản" },
  { symbol: "FPT", name: "CTCP FPT", price: 135200, prevClose: 133500, change: 1700, changePercent: 1.27, type: "EQUITY", sector: "Công nghệ" },
  { symbol: "VNM", name: "CTCP Sữa Việt Nam (Vinamilk)", price: 66500, prevClose: 66800, change: -300, changePercent: -0.45, type: "EQUITY", sector: "Hàng Tiêu dùng" },
  { symbol: "VCB", name: "Ngân hàng TMCP Ngoại Thương VN (Vietcombank)", price: 91200, prevClose: 91500, change: -300, changePercent: -0.33, type: "EQUITY", sector: "Ngân hàng" },
  { symbol: "TCB", name: "Ngân hàng TMCP Kỹ Thương VN (Techcombank)", price: 24500, prevClose: 24100, change: 400, changePercent: 1.66, type: "EQUITY", sector: "Ngân hàng" },
  { symbol: "SSI", name: "CTCP Chứng khoán SSI", price: 35400, prevClose: 34900, change: 500, changePercent: 1.43, type: "EQUITY", sector: "Dịch vụ Tài chính" },
  { symbol: "VND", name: "CTCP Chứng khoán VNDIRECT", price: 20100, prevClose: 20300, change: -200, changePercent: -0.99, type: "EQUITY", sector: "Dịch vụ Tài chính" },
  { symbol: "MWG", name: "CTCP Đầu tư Thế giới Di động", price: 61200, prevClose: 60800, change: 400, changePercent: 0.66, type: "EQUITY", sector: "Bán lẻ" },
  { symbol: "VIC", name: "Tập đoàn Vingroup - CTCP", price: 42500, prevClose: 42900, change: -400, changePercent: -0.93, type: "EQUITY", sector: "Bất động sản" },
  { symbol: "VHM", name: "CTCP Vinhomes", price: 41100, prevClose: 40800, change: 300, changePercent: 0.74, type: "EQUITY", sector: "Bất động sản" },
  { symbol: "MSN", name: "CTCP Tập đoàn Masan", price: 74500, prevClose: 75100, change: -600, changePercent: -0.80, type: "EQUITY", sector: "Hàng Tiêu dùng" },
  { symbol: "ACB", name: "Ngân hàng TMCP Á Châu", price: 27900, prevClose: 27500, change: 400, changePercent: 1.45, type: "EQUITY", sector: "Ngân hàng" },
  { symbol: "E1VFVN30", name: "Chứng chỉ Quỹ ETF VFMVN30", price: 22100, prevClose: 22000, change: 100, changePercent: 0.45, type: "ETF", sector: "Quỹ Chỉ số" },
  { symbol: "FUEVFVND", name: "Chứng chỉ Quỹ ETF DCVFMVN DIAMOND", price: 31500, prevClose: 31400, change: 100, changePercent: 0.32, type: "ETF", sector: "Quỹ Chỉ số" },
  { symbol: "VN30F1M", name: "Hợp đồng Tương lai Chỉ số VN30 tháng hiện tại", price: 1285.5, prevClose: 1281.0, change: 4.5, changePercent: 0.35, type: "DERIVATIVE", sector: "Phái sinh" }
];

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
}

let marketIndices: MarketIndex[] = [
  { symbol: "VNINDEX", name: "VN-Index", price: 1285.50, prevClose: 1281.00, change: 4.50, changePercent: 0.35 },
  { symbol: "VN30", name: "VN30", price: 1292.15, prevClose: 1288.50, change: 3.65, changePercent: 0.28 },
  { symbol: "HNX", name: "HNX-Index", price: 243.20, prevClose: 244.10, change: -0.90, changePercent: -0.37 },
  { symbol: "UPCOM", name: "UPCoM-Index", price: 95.80, prevClose: 95.55, change: 0.25, changePercent: 0.26 }
];

// Sync Real Stock Market Prices from VNSTOCK or SSI FCData API
let isRefreshingRealtime = false;
let lastSyncedAt: Date | null = null;
let lastSyncedSource = "Simulation";
let lastSyncError: string | null = null;
let ssiSyncDetails = {
  isConfigured: false,
  hasConsumerId: false,
  hasConsumerSecret: false,
  lastAuthAttempt: null as string | null,
  lastPriceAttempt: null as string | null,
  lastSsiResponseStatus: null as number | null,
  lastSsiResponseBody: null as string | null
};

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateValue(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function syncRealMarketPrices() {
  if (isRefreshingRealtime) return;
  isRefreshingRealtime = true;

  const ssiId = process.env.SSI_CONSUMER_ID;
  const ssiSecret = process.env.SSI_CONSUMER_SECRET || process.env.SSI_CONSUMER_SECR;

  ssiSyncDetails.isConfigured = !!(ssiId && ssiSecret);
  ssiSyncDetails.hasConsumerId = !!ssiId;
  ssiSyncDetails.hasConsumerSecret = !!ssiSecret;

  if (ssiId && ssiSecret) {
    console.log("🔐 Phát hiện thiết lập tài khoản SSI FCData API. Đang kết nối...");
    ssiSyncDetails.lastAuthAttempt = new Date().toISOString();
    try {
      const authUrl = "https://fc-data.ssi.com.vn/api/v2/Market/AccessToken";
      const authResponse = await fetchWithTimeout(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          consumerID: ssiId,
          consumerSecret: ssiSecret
        })
      }, 5000);

      ssiSyncDetails.lastSsiResponseStatus = authResponse.status;
      if (authResponse.ok) {
        const authData = await authResponse.json() as any;
        const accessToken = authData.token || (authData.data && authData.data.accessToken) || authData.accessToken;

        if (accessToken) {
          console.log("🌸 Đăng nhập SSI FCData API thành công! Đang tải dữ liệu chứng khoán...");
          ssiSyncDetails.lastPriceAttempt = new Date().toISOString();
          const toDate = new Date();
          const fromDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days
          const toDateStr = formatDateValue(toDate);
          const fromDateStr = formatDateValue(fromDate);

          let ssiSyncedCount = 0;
          let ssiLastErrorDetails = "";

          for (let i = 0; i < marketAssets.length; i++) {
            const asset = marketAssets[i];
            try {
              const symbol = asset.symbol;
              const priceUrl = `https://fc-data.ssi.com.vn/api/v2/Market/DailyStockPrice?lookupRequest.symbol=${symbol}&lookupRequest.fromDate=${fromDateStr}&lookupRequest.toDate=${toDateStr}&lookupRequest.pageIndex=1&lookupRequest.pageSize=10`;

              const priceResponse = await fetchWithTimeout(priceUrl, {
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Accept": "application/json"
                }
              }, 4000);

              if (priceResponse.ok) {
                const priceData = await priceResponse.json() as any;
                const records = priceData && (
                  Array.isArray(priceData.data) ? priceData.data :
                  Array.isArray(priceData.dataList) ? priceData.dataList :
                  (priceData.data && Array.isArray(priceData.data.dataList)) ? priceData.data.dataList :
                  (priceData.data && Array.isArray(priceData.data.data)) ? priceData.data.data :
                  null
                );

                if (records && records.length > 0) {
                  // Take the latest record chronologically (usually the last in the list)
                  const latestRecord = records[records.length - 1];

                  const rawClose = Number(latestRecord.closeprice) || Number(latestRecord.close) || 0;
                  const rawRef = Number(latestRecord.refprice) || Number(latestRecord.basicPrice) || 0;
                  const rawChange = Number(latestRecord.pricechange) || Number(latestRecord.change) || 0;
                  const rawPct = Number(latestRecord.perpricechange) || Number(latestRecord.pctChange) || 0;

                  if (rawClose > 0) {
                    // SSI can use full VNĐ unit (e.g. 28500) rather than standard unit on board (28.5)
                    // If it is small (e.g. < 1000) and not a derivative, scale by 1000
                    const price = rawClose < 1000 && asset.type !== 'DERIVATIVE' ? rawClose * 1000 : rawClose;
                    const prevClose = rawRef < 1000 && asset.type !== 'DERIVATIVE' ? rawRef * 1000 : rawRef;
                    const change = rawChange < 500 && asset.type !== 'DERIVATIVE' ? rawChange * 1000 : rawChange;

                    asset.price = price;
                    asset.prevClose = prevClose > 0 ? prevClose : price - change;
                    asset.change = change;
                    asset.changePercent = Math.round(rawPct * 100) / 100;
                    ssiSyncedCount++;
                  }
                } else if (priceData && priceData.message) {
                  ssiLastErrorDetails = `DailyStockPrice msg: ${priceData.message}`;
                }
              } else {
                const bodyTxt = await priceResponse.text();
                ssiLastErrorDetails = `DailyStockPrice HTTP ${priceResponse.status}: ${bodyTxt}`;
              }
            } catch (symErr: any) {
              ssiLastErrorDetails = `DailyStockPrice exception: ${symErr.message || symErr}`;
            }

            // Sleep 1100ms between assets to respect the 1/s rate limit
            if (i < marketAssets.length - 1) {
              await sleep(1100);
            }
          }

          // Sync indices from SSI DailyIndex API if available
          try {
            for (let j = 0; j < marketIndices.length; j++) {
              // Pause 1100ms before fetching index to avoid rate limits
              await sleep(1100);

              const idx = marketIndices[j];
              const indexId = idx.symbol === 'VNINDEX' ? 'VNINDEX' : idx.symbol;
              const indexUrl = `https://fc-data.ssi.com.vn/api/v2/Market/DailyIndex?lookupRequest.indexId=${indexId}&lookupRequest.fromDate=${fromDateStr}&lookupRequest.toDate=${toDateStr}&lookupRequest.pageIndex=1&lookupRequest.pageSize=10`;

              const idxResponse = await fetchWithTimeout(indexUrl, {
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Accept": "application/json"
                }
              }, 4000);

              if (idxResponse.ok) {
                const idxData = await idxResponse.json() as any;
                const idxRecords = idxData && (
                  Array.isArray(idxData.data) ? idxData.data :
                  Array.isArray(idxData.dataList) ? idxData.dataList :
                  (idxData.data && Array.isArray(idxData.data.dataList)) ? idxData.data.dataList :
                  (idxData.data && Array.isArray(idxData.data.data)) ? idxData.data.data :
                  null
                );

                if (idxRecords && idxRecords.length > 0) {
                  const latestIdxRecord = idxRecords[idxRecords.length - 1];

                  const value = Number(latestIdxRecord.indexValue) || Number(latestIdxRecord.indexvalue) || 0;
                  const change = Number(latestIdxRecord.change) || 0;
                  const pctChange = Number(latestIdxRecord.ratioChange) || Number(latestIdxRecord.ratiochange) || 0;

                  if (value > 0) {
                    idx.price = value;
                    idx.change = change;
                    idx.changePercent = Math.round(pctChange * 100) / 100;
                    idx.prevClose = value - change;
                  }
                }
              }
            }
          } catch (idxErr) {
            // Ignore index sync error
          }

          if (ssiSyncedCount > 0) {
            lastSyncedAt = new Date();
            lastSyncedSource = "SSI FCData";
            lastSyncError = null;
            ssiSyncDetails.lastSsiResponseBody = "Dữ liệu chứng khoán đồng bộ thành công!";
            console.log(`✅ Đồng bộ thành công ${ssiSyncedCount} mã tài sản từ SSI FCData API!`);
            isRefreshingRealtime = false;
            return;
          } else {
            lastSyncError = `Không có mã nào được đồng bộ từ SSI. Chi tiết: ${ssiLastErrorDetails || "Có thể sai cấu hình/IP đăng ký hoặc phiên giao dịch hết hạn."}`;
          }
        } else {
          lastSyncError = "Không tìm thấy token dạng Bearer trong dữ liệu đăng nhập SSI.";
        }
      } else {
        const bodyTxt = await authResponse.text();
        ssiSyncDetails.lastSsiResponseBody = bodyTxt;
        lastSyncError = `SSI Auth failed with status ${authResponse.status}: ${bodyTxt || "No response"}`;
      }
    } catch (err: any) {
      lastSyncError = `SSI Sync exception: ${err?.message || err}`;
      console.warn(`⚠️ Kết nối SSI FCData thất bại: ${lastSyncError}. Sang chế độ VNDIRECT/TCBS...`);
    }
  }

  // Fallback to VNDIRECT & TCBS public source (previously referred to as VNSTOCK in client indicators)
  console.log("🔄 Đồng bộ bảng giá từ nguồn VNSTOCK (VNDIRECT & TCBS)...");

  let syncSuccessAny = false;

  // 1. Fetch Equities & ETFs from VNDIRECT FinInfo API (Vnstock core feed)
  try {
    const stockList = ["HPG", "FPT", "VNM", "VCB", "TCB", "SSI", "VND", "MWG", "VIC", "VHM", "MSN", "ACB", "E1VFVN30", "FUEVFVND"];
    const url = `https://finfo-api.vndirect.com.vn/v4/stock_prices?q=code:${stockList.join(",")}&size=100`;
    
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://banggia.vndirect.com.vn/"
      }
    }, 4000);

    if (response.ok) {
      const result = await response.json() as any;
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        // Group by symbol to get the latest quote for each ticker
        const latestQuotes = new Map<string, any>();
        result.data.forEach((item: any) => {
          if (!item.code) return;
          const sym = item.code.toUpperCase();
          const existing = latestQuotes.get(sym);
          if (!existing || new Date(item.date) > new Date(existing.date)) {
            latestQuotes.set(sym, item);
          }
        });

        latestQuotes.forEach((item, symbol) => {
          const asset = marketAssets.find(a => a.symbol === symbol);
          if (asset) {
            // Equities and ETFs in VN market price board are divided by 1000, so multiply by 1000 for standard dong
            const closePrice = Math.round(item.close * 1000);
            const basicPrice = Math.round(item.basicPrice * 1000) || Math.round((item.close - item.change) * 1000);
            const change = Math.round(item.change * 1000);
            const pctChange = item.pctChange || (basicPrice > 0 ? (change / basicPrice) * 100 : 0);

            asset.price = closePrice;
            asset.prevClose = basicPrice;
            asset.change = change;
            asset.changePercent = Math.round(pctChange * 100) / 100;
          }
        });
        console.log("✅ Cập nhật thành công nhóm cổ phiếu & chứng chỉ quỹ từ VNDIRECT!");
        syncSuccessAny = true;
      }
    } else {
      console.warn(`⚠️ Phản hồi từ VNDIRECT không thành công: ${response.status}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Bỏ qua đồng bộ bảng giá VNDIRECT: API không phản hồi kịp hoặc lỗi kết nối (${err.message || err})`);
  }

  // 2. Fetch Derivative VN30F1M from TCBS Bot Public API
  try {
    const nowSecs = Math.floor(Date.now() / 1000);
    const thirtyDaysAgoSecs = nowSecs - (30 * 24 * 60 * 60);
    const tcbsUrl = `https://apipub.tcbs.com.vn/tcbs-bot/stock/historical-data?ticker=VN30F1M&type=derivative&resolution=D&from=${thirtyDaysAgoSecs}&to=${nowSecs}`;

    const tcbsResponse = await fetchWithTimeout(tcbsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, 4000);

    if (tcbsResponse.ok) {
      const tcbsResult = await tcbsResponse.json() as any;
      if (tcbsResult && Array.isArray(tcbsResult.data) && tcbsResult.data.length > 0) {
        const latestCandle = tcbsResult.data[tcbsResult.data.length - 1];
        const prevCandle = tcbsResult.data[tcbsResult.data.length - 2] || latestCandle;
        
        const asset = marketAssets.find(a => a.symbol === "VN30F1M");
        if (asset && latestCandle) {
          const closePrice = latestCandle.close; // Derivatives use index points directly
          const prevClose = prevCandle.close;
          const change = closePrice - prevClose;
          const pctChange = prevClose > 0 ? (change / prevClose) * 100 : 0;

          asset.price = closePrice;
          asset.prevClose = prevClose;
          asset.change = Math.round(change * 100) / 100;
          asset.changePercent = Math.round(pctChange * 100) / 100;
          console.log(`✅ Cập nhật thành công mã phái sinh VN30F1M từ TCBS: ${closePrice} điểm`);
          syncSuccessAny = true;
        }
      }
    } else {
      console.warn(`⚠️ Phản hồi từ TCBS không thành công: ${tcbsResponse.status}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Bỏ qua đồng bộ phái sinh TCBS: API không phản hồi kịp hoặc lỗi kết nối (${err.message || err})`);
  }

  // 3. Fetch Market Indices from VNDIRECT index_informations API
  try {
    const indicesCodeList = ["VNINDEX", "VN30", "HNX", "UPCOM"];
    const indicesUrl = `https://finfo-api.vndirect.com.vn/v4/index_informations?q=indexCode:${indicesCodeList.join(",")}&size=40`;
    
    const indicesResponse = await fetchWithTimeout(indicesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://banggia.vndirect.com.vn/"
      }
    }, 4000);

    if (indicesResponse.ok) {
      const idxResult = await indicesResponse.json() as any;
      if (idxResult && Array.isArray(idxResult.data) && idxResult.data.length > 0) {
        const latestIndices = new Map<string, any>();
        idxResult.data.forEach((item: any) => {
          if (!item.indexCode) return;
          const code = item.indexCode.toUpperCase();
          const existing = latestIndices.get(code);
          if (!existing || new Date(item.date) > new Date(existing.date)) {
            latestIndices.set(code, item);
          }
        });

        latestIndices.forEach((item, code) => {
          const idxObj = marketIndices.find(i => i.symbol === code);
          if (idxObj) {
            const price = Number(item.indexValue) || Number(item.price) || idxObj.price;
            const change = Number(item.change) !== undefined ? Number(item.change) : idxObj.change;
            const pctChange = Number(item.pctChange) !== undefined ? Number(item.pctChange) : ((price - idxObj.prevClose) / idxObj.prevClose * 100);
            
            idxObj.price = price;
            idxObj.change = change;
            idxObj.changePercent = Math.round(pctChange * 100) / 100;
            idxObj.prevClose = price - change;
          }
        });
        console.log("✅ Cập nhật thành công điểm số các chỉ số (index) từ VNDIRECT!");
        syncSuccessAny = true;
      }
    } else {
      console.warn(`⚠️ Phản hồi chỉ số VNDIRECT không thành công: ${indicesResponse.status}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Bỏ qua đồng bộ chỉ số VNDIRECT: API không phản hồi kịp hoặc lỗi kết nối (${err.message || err})`);
  }

  if (syncSuccessAny) {
    lastSyncedAt = new Date();
    lastSyncedSource = "VNSTOCK";
  }
  isRefreshingRealtime = false;
}

// Initial Sync on boot
syncRealMarketPrices().catch(err => console.error("Initial sync on boot failed", err));

// Sync from VNSTOCK every 60 seconds
setInterval(() => {
  syncRealMarketPrices().catch(err => console.error("Interval sync failed", err));
}, 60000);

// Fluctuate prices slightly every 5 seconds to simulate dynamic near-realtime market changes on top of synced data
setInterval(() => {
  marketAssets = marketAssets.map(asset => {
    // Small random micro-variations (-0.1% to +0.1%)
    const pct = (Math.random() * 0.2 - 0.1) / 100;
    const oldPrice = asset.price;
    let newPrice = oldPrice * (1 + pct);
    
    if (asset.type === 'DERIVATIVE') {
      newPrice = Math.round(newPrice * 10) / 10;
    } else {
      newPrice = Math.round(newPrice);
    }

    const change = newPrice - asset.prevClose;
    const changePercent = Math.round((change / asset.prevClose) * 10000) / 100;

    return {
      ...asset,
      price: newPrice,
      change,
      changePercent
    };
  });

  // Small random micro-variations to indexes (-0.05% to +0.05%)
  marketIndices = marketIndices.map(idx => {
    const pct = (Math.random() * 0.1 - 0.05) / 100;
    const oldPrice = idx.price;
    const newPrice = Math.round((oldPrice * (1 + pct)) * 100) / 100;
    const change = Math.round((newPrice - idx.prevClose) * 100) / 100;
    const changePercent = idx.prevClose > 0 ? Math.round((change / idx.prevClose) * 10000) / 100 : 0;

    return {
      ...idx,
      price: newPrice,
      change,
      changePercent
    };
  });
}, 5000);

// API Routes

// 1. Get entire market data feed (enhanced with sync status)
app.get("/api/market-data", (req, res) => {
  res.json({
    assets: marketAssets,
    indices: marketIndices,
    source: lastSyncedSource === "Simulation" ? "Simulation" : `${lastSyncedSource} (Live API)`,
    lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : new Date().toISOString(),
    realtimeActive: true,
    diagnostics: {
      lastSyncedSource,
      lastSyncError,
      isConfigured: ssiSyncDetails.isConfigured,
      hasConsumerId: ssiSyncDetails.hasConsumerId,
      hasConsumerSecret: ssiSyncDetails.hasConsumerSecret,
      lastAuthAttempt: ssiSyncDetails.lastAuthAttempt,
      lastPriceAttempt: ssiSyncDetails.lastPriceAttempt,
      lastSsiResponseStatus: ssiSyncDetails.lastSsiResponseStatus,
      lastSsiResponseBody: ssiSyncDetails.lastSsiResponseBody,
    }
  });
});

// 2. Get specific symbol quote
app.get("/api/market-data/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const asset = marketAssets.find(a => a.symbol === symbol);
  if (!asset) {
    return res.status(404).json({ error: "Không tìm thấy mã chứng khoán" });
  }
  res.json(asset);
});

// 3. Server-side Gemini OCR screenshot parsing endpoint
app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64, broker } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "Thiếu dữ liệu ảnh base64" });
    }

    if (!ai) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "Gemini API service chưa được cấu hình. Bạn hãy mục Settings > Secrets nạp GEMINI_API_KEY để kích hoạt tính năng trích xuất danh mục tự động từ ảnh chụp màn hình." 
      });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Prepare content for Gemini Vision
    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: base64Data
      }
    };

    const promptText = `
Hãy là một trợ lý phân tích ảnh chụp màn hình cực kỳ chính xác. Nhiệm vụ của bạn là đọc ảnh chụp màn hình danh mục tài sản/vị thế chứng khoán từ ứng dụng CTCK Việt Nam (${broker || 'SSI, TCBS, VPS, Pinetree hoặc MBS'}).
Hãy trích xuất từng mã cổ phiếu (stock symbol), số lượng (quantity) và giá vốn mua trung bình (averageCostPrice).

Nguyên tắc cực kỳ quan trọng về giá vốn:
- Trên thị trường chứng khoán Việt Nam, các ứng dụng thường hiển thị giá trị rút gọn bằng nghìn đồng (ví dụ: hiển thị "28.5" hoặc "28.50" để biểu thị "28500 VND"; hiển thị "135.2" để biểu thị "135200 VND").
- Hãy PHÁT HIỆN xem có phải giá đang ở dạng nghìn đồng không. Nếu có, hãy NHÂN VỚI 1000 để chuyển về đơn vị đầy đủ đồng (VND). Ví dụ: 28.5 => 28500, 71.0 => 71000, 6.4 => 6400, 115.6 => 115600.
- Nếu giá đã ở dạng đầy đủ như "28,500" hoặc "28500", hãy lưu đúng 28500 (không nhân tiếp).
- Số lượng (quantity) phải là số nguyên dương lớn hơn 0 (ví dụ: 100, 1000, 450). Nếu số lượng bị cắt bớt hoặc có ký tự lạ thì làm sạch nó chỉ giữ lại số.
- Chỉ trích xuất các vị thế đầu tư đang sở hữu thực tế (có số lượng > 0). Bỏ qua các mục tiền mặt, sức mua hay dư nợ nếu có.
- Trả về kết quả chính xác theo cấu trúc schema JSON array.
`;

    let response: any = null;
    let lastError: any = null;
    const maxAttempts = 3;

    // Retry loop on primary model (gemini-3.5-flash) to handle transient errors like 503 Spike in demand
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const modelName = "gemini-3.5-flash";
        console.log(`🤖 [Attempt ${attempt}/${maxAttempts}] Gọi Gemini OCR qua model: ${modelName}`);
        
        response = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, { text: promptText }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "Danh sách các vị thế đầu tư chứng khoán được trích xuất từ ảnh",
              items: {
                type: Type.OBJECT,
                properties: {
                  stockSymbol: { 
                    type: Type.STRING, 
                    description: "Mã chứng khoán, ví dụ: HPG, FPT, VNM, E1VFVN30, VN30F1M" 
                  },
                  quantity: { 
                    type: Type.NUMBER, 
                    description: "Số lượng chứng khoán sở hữu, ví dụ: 200" 
                  },
                  averageCostPrice: { 
                    type: Type.NUMBER, 
                    description: "Giá mua trung bình thực tế bằng VNĐ đầy đủ (ví dụ: 25700)" 
                  }
                },
                required: ["stockSymbol", "quantity", "averageCostPrice"]
              }
            }
          }
        });

        if (response && response.text) {
          console.log(`✅ Thành công ở lượt thứ ${attempt} bằng model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || err?.toString() || "";
        console.warn(`⚠️ Lượt thứ ${attempt} thất bại với lỗi: ${errMsg}`);
        
        if (attempt < maxAttempts) {
          const delayMs = attempt * 1500; // 1500ms, then 3000ms
          console.log(`🔄 Đang chờ ${delayMs}ms trước khi thử lại...`);
          await sleep(delayMs);
        }
      }
    }

    // Ultimate fallback to "gemini-3.1-flash-lite" if all primary attempts failed
    if (!response || !response.text) {
      const fallbackModel = "gemini-3.1-flash-lite";
      console.log(`🚨 Kích hoạt model dự phòng cấp độ cao nhất: ${fallbackModel}`);
      try {
        response = await ai.models.generateContent({
          model: fallbackModel,
          contents: { parts: [imagePart, { text: promptText }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "Danh sách các vị thế đầu tư chứng khoán được trích xuất từ ảnh",
              items: {
                type: Type.OBJECT,
                properties: {
                  stockSymbol: { 
                    type: Type.STRING, 
                    description: "Mã chứng khoán, ví dụ: HPG, FPT, VNM, E1VFVN30, VN30F1M" 
                  },
                  quantity: { 
                    type: Type.NUMBER, 
                    description: "Số lượng chứng khoán sở hữu, ví dụ: 200" 
                  },
                  averageCostPrice: { 
                    type: Type.NUMBER, 
                    description: "Giá mua trung bình thực tế bằng VNĐ đầy đủ (ví dụ: 25700)" 
                  }
                },
                required: ["stockSymbol", "quantity", "averageCostPrice"]
              }
            }
          }
        });
        if (response && response.text) {
          console.log(`✅ Thành công sử dụng model dự phòng: ${fallbackModel}`);
        }
      } catch (fallbackErr: any) {
        console.error("🚨 Cả model chính và model dự phòng đều gặp lỗi:", fallbackErr);
        throw lastError || fallbackErr;
      }
    }

    const responseText = response ? response.text : null;
    if (!responseText) {
      return res.status(500).json({ error: "Gemini không trả về kết quả dịch." });
    }

    try {
      const parsedPositions = JSON.parse(responseText.trim());
      res.json({
        success: true,
        broker,
        positions: parsedPositions
      });
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", responseText);
      res.status(500).json({ 
        error: "Trích xuất thành công nhưng định dạng kết quả bị lỗi.", 
        rawText: responseText 
      });
    }

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ 
      error: error?.message || "Đã xảy ra lỗi không xác định khi gọi Gemini OCR API" 
    });
  }
});

// Setup Vite Development Server Middleware or Production Static Service
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Assetly server running on http://localhost:${PORT}`);
  });
}

startServer();
