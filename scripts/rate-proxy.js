const http = require("http");
const https = require("https");

const PORT = Number(process.env.RATE_PORT) || 8787;
// Usa el mismo valor del gráfico: https://www.tradingview.com/chart/o5jQyVQx/?symbol=FX_IDC%3AUSDEUR
const TRADINGVIEW_URL = "https://scanner.tradingview.com/forex/scan";
const CACHE_TTL_MS = 60 * 1000;

let cache = {
  rate: null,
  fetchedAt: 0
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const fetchTradingView = (symbol) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      symbols: { tickers: [symbol], query: { types: [] } },
      columns: ["close"]
    });
    const req = https.request(
      TRADINGVIEW_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

const parseTradingViewRate = (jsonText) => {
  try {
    const data = JSON.parse(jsonText);
    const rate = data?.data?.[0]?.d?.[0];
    return Number(rate);
  } catch (e) {
    return null;
  }
};

const getRate = async (pair) => {
  const now = Date.now();
  if (cache.rate && cache.pair === pair && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }
  const symbol = pair === "USDEUR" ? "FX_IDC:USDEUR" : "FX_IDC:USDCOP";
  const raw = await fetchTradingView(symbol);
  const rate = parseTradingViewRate(raw);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("No se pudo leer la tasa");
  }
  cache = { rate, fetchedAt: now, pair };
  return rate;
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.url.startsWith("/api/rate")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pair = (url.searchParams.get("pair") || "USDCOP").toUpperCase();
      const rate = await getRate(pair);
      res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          rate,
          source: "tradingview",
          pair,
          fetchedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      res.writeHead(502, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: String(error?.message || "Error"),
          source: "tradingview",
          fetchedAt: new Date().toISOString()
        })
      );
    }
    return;
  }

  res.writeHead(404, corsHeaders);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`Rate proxy activo en http://localhost:${PORT}/api/rate`);
});
