// Maps a product URL's hostname to a friendly store display name.

const STORE_NAME_MAP: Record<string, string> = {
  "amazon.com": "Amazon",
  "amazon.co.uk": "Amazon",
  "amazon.ca": "Amazon",
  "amazon.de": "Amazon",
  "amazon.fr": "Amazon",
  "amazon.it": "Amazon",
  "amazon.es": "Amazon",
  "amazon.co.jp": "Amazon",
  "amazon.in": "Amazon",
  "amazon.com.au": "Amazon",
  "ebay.com": "eBay",
  "ebay.co.uk": "eBay",
  "ebay.de": "eBay",
  "etsy.com": "Etsy",
  "aliexpress.com": "AliExpress",
  "aliexpress.us": "AliExpress",
  "walmart.com": "Walmart",
  "target.com": "Target",
  "bestbuy.com": "Best Buy",
  "wayfair.com": "Wayfair",
  "ikea.com": "IKEA",
  "newegg.com": "Newegg",
  "zappos.com": "Zappos",
};

export function storeNameFromUrl(url: URL): string {
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  if (STORE_NAME_MAP[hostname]) return STORE_NAME_MAP[hostname];
  const parts = hostname.split(".");
  if (parts.length > 2) {
    const base = parts.slice(-2).join(".");
    if (STORE_NAME_MAP[base]) return STORE_NAME_MAP[base];
  }
  return hostname;
}
