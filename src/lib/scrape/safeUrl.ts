// URL safety validation: protocol allow-listing and private/internal host
// blocking, used both before the initial fetch and before following each
// redirect hop.

export type SafeUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function isSafeUrl(input: string): SafeUrlCheck {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http:// and https:// URLs are supported." };
  }
  if (isPrivateHostname(url.hostname.toLowerCase())) {
    return { ok: false, reason: "URLs pointing to internal/private hosts are not allowed." };
  }
  return { ok: true, url };
}

export function isPrivateHostname(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (bare === "localhost" || bare.endsWith(".localhost")) return true;
  if (bare === "0.0.0.0" || bare === "::1" || bare === "::") return true;

  const ipv4 = bare.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 169 && b === 254) return true; // link-local
    if (a === 0) return true;
    return false;
  }

  // IPv6 unique-local / link-local literals.
  if (/^fc[0-9a-f]{2}:/i.test(bare) || /^fd[0-9a-f]{2}:/i.test(bare)) return true;
  if (/^fe80:/i.test(bare)) return true;

  return false;
}
