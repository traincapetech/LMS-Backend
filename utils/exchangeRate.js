const https = require("https");

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map();

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(`Rate API error ${res.statusCode}: ${data}`)
            );
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });

const getRates = async (base, symbols) => {
  const key = `${base}:${symbols}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.rates;
  }

  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(
    base
  )}&symbols=${encodeURIComponent(symbols)}`;
  const data = await fetchJson(url);
  const rates = data?.rates || {};
  cache.set(key, { rates, timestamp: now });
  return rates;
};

const getRate = async (base, target) => {
  if (base === target) return 1;
  const rates = await getRates(base, target);
  const rate = rates?.[target];
  if (!rate || Number.isNaN(Number(rate))) {
    throw new Error(`Rate not available for ${base}->${target}`);
  }
  return Number(rate);
};

module.exports = { getRates, getRate };
