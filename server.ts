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

// Sync Real Stock Market Prices from VNSTOCK (VNDIRECT & TCBS public financial REST API feeds)
let isRefreshingRealtime = false;
let lastSyncedAt: Date | null = null;

async function syncRealMarketPrices() {
  if (isRefreshingRealtime) return;
  isRefreshingRealtime = true;
  console.log("🔄 Đồng bộ bảng giá VNSTOCK từ VNDIRECT & TCBS...");

  try {
    // 1. Fetch Equities & ETFs from VNDIRECT FinInfo API (Vnstock core feed)
    const stockList = ["HPG", "FPT", "VNM", "VCB", "TCB", "SSI", "VND", "MWG", "VIC", "VHM", "MSN", "ACB", "E1VFVN30", "FUEVFVND"];
    const url = `https://finfo-api.vndirect.com.vn/v4/stock_prices?q=code:${stockList.join(",")}&size=100`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://banggia.vndirect.com.vn/"
      }
    });

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
      }
    } else {
      console.warn(`⚠️ Phản hồi từ VNDIRECT không thành công: ${response.status}`);
    }

    // 2. Fetch Derivative VN30F1M from TCBS Bot Public API
    const nowSecs = Math.floor(Date.now() / 1000);
    const thirtyDaysAgoSecs = nowSecs - (30 * 24 * 60 * 60);
    const tcbsUrl = `https://apipub.tcbs.com.vn/tcbs-bot/stock/historical-data?ticker=VN30F1M&type=derivative&resolution=D&from=${thirtyDaysAgoSecs}&to=${nowSecs}`;

    const tcbsResponse = await fetch(tcbsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

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
        }
      }
    } else {
      console.warn(`⚠️ Phản hồi từ TCBS không thành công: ${tcbsResponse.status}`);
    }

    // 3. Fetch Market Indices from VNDIRECT index_informations API
    const indicesCodeList = ["VNINDEX", "VN30", "HNX", "UPCOM"];
    const indicesUrl = `https://finfo-api.vndirect.com.vn/v4/index_informations?q=indexCode:${indicesCodeList.join(",")}&size=40`;
    
    const indicesResponse = await fetch(indicesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://banggia.vndirect.com.vn/"
      }
    });

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
      }
    } else {
      console.warn(`⚠️ Phản hồi chỉ số VNDIRECT không thành công: ${indicesResponse.status}`);
    }

    lastSyncedAt = new Date();

  } catch (err) {
    console.error("❌ Lỗi xảy ra khi đồng bộ bảng giá thực tế VNSTOCK:", err);
  } finally {
    isRefreshingRealtime = false;
  }
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
    source: "VNSTOCK (VNDIRECT, TCBS live REST APIs)",
    lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : new Date().toISOString(),
    realtimeActive: true
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
      return res.status(503).json({ 
        error: "Gemini API service chưa được cấu hình. Bạn hãy thiết lập GEMINI_API_KEY trong panel Secrets." 
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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

    const responseText = response.text;
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
    console.log(`🚀 AssMan server running on http://localhost:${PORT}`);
  });
}

startServer();
