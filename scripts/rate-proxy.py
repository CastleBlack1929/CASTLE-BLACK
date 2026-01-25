from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import time
import urllib.request

PORT = 8787
TRADINGVIEW_URL = "https://scanner.tradingview.com/forex/scan"
TRADINGVIEW_PAYLOAD = {
  "symbols": {"tickers": ["FX_IDC:USDCOP"], "query": {"types": []}},
  "columns": ["close"],
}
CACHE_TTL_SECONDS = 30
REQUEST_TIMEOUT_SECONDS = 4
FETCH_TIMEOUT_SECONDS = REQUEST_TIMEOUT_SECONDS + 1

cache_rate = None
cache_time = 0


def fetch_rate_tradingview():
  data = json.dumps(TRADINGVIEW_PAYLOAD).encode("utf-8")
  req = urllib.request.Request(
    TRADINGVIEW_URL,
    data=data,
    headers={
      "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
      ),
      "Content-Type": "application/json",
    },
  )
  with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
    payload = json.loads(resp.read().decode("utf-8", "ignore"))
    data_row = (payload.get("data") or [None])[0]
    if not data_row:
      return None
    values = data_row.get("d") or []
    if not values:
      return None
    return float(values[0])


def fetch_rate_with_timeout():
  result = {"rate": None, "error": None}

  def _run():
    try:
      result["rate"] = fetch_rate_tradingview()
    except Exception as exc:
      result["error"] = exc

  thread = threading.Thread(target=_run, daemon=True)
  thread.start()
  thread.join(FETCH_TIMEOUT_SECONDS)
  if thread.is_alive():
    return None, TimeoutError("Tiempo de espera agotado")
  if result["error"] is not None:
    return None, result["error"]
  return result["rate"], None


def get_rate():
  global cache_rate, cache_time
  now = time.time()
  if cache_rate and (now - cache_time) < CACHE_TTL_SECONDS:
    return cache_rate
  rate, error = fetch_rate_with_timeout()
  if error:
    raise error
  if rate is None:
    raise ValueError("No se pudo leer la tasa")
  cache_rate = rate
  cache_time = now
  return rate


class RateHandler(BaseHTTPRequestHandler):
  def _send_headers(self, status, content_type="application/json"):
    self.send_response(status)
    self.send_header("Content-Type", content_type)
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.end_headers()

  def do_OPTIONS(self):
    self._send_headers(204, "text/plain")

  def do_GET(self):
    if self.path != "/api/rate":
      self._send_headers(404, "text/plain")
      self.wfile.write(b"Not Found")
      return
    try:
      rate = get_rate()
      self._send_headers(200)
      payload = {
        "rate": rate,
        "source": "tradingview",
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
      }
      self.wfile.write(json.dumps(payload).encode("utf-8"))
    except Exception as exc:
      self._send_headers(502)
      payload = {
        "error": str(exc),
        "source": "tradingview",
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
      }
      self.wfile.write(json.dumps(payload).encode("utf-8"))


if __name__ == "__main__":
  server = ThreadingHTTPServer(("localhost", PORT), RateHandler)
  print(f"Rate proxy activo en http://localhost:{PORT}/api/rate")
  server.serve_forever()
