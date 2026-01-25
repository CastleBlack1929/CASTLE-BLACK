const http = require("http");
const https = require("https");

const PORT = Number(process.env.RATE_PORT) || 8787;
const SOURCE_URL = "https://www.google.com/finance/quote/USD-COP?hl=es";
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

const fetchHtml = () =>
  new Promise((resolve, reject) => {
    https
      .get(
        SOURCE_URL,
        {
          headers: {
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
      )
      .on("error", reject);
  });

const parseRate = (html) => {
  let match = html.match(/data-last-price=\"([0-9.,]+)\"/);
  if (match && match[1]) {
    return Number(match[1].replace(/,/g, ""));
  }
  match = html.match(/YMlKec fxKbKc\">([^<]+)</);
  if (match && match[1]) {
    return Number(match[1].replace(/,/g, ""));
  }
  return null;
};

const getRate = async () => {
  const now = Date.now();
  if (cache.rate && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }
  const html = await fetchHtml();
  const rate = parseRate(html);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("No se pudo leer la tasa");
  }
  cache = { rate, fetchedAt: now };
  return rate;
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.url === "/api/rate") {
    try {
      const rate = await getRate();
      res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          rate,
          source: "google-finance",
          fetchedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      res.writeHead(502, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: String(error?.message || "Error"),
          source: "google-finance",
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
