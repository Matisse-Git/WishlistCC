export const AUTH_COOKIE_NAME = "wishlistcc_auth";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns null when APP_PASSWORD isn't set — auth is disabled by default. */
export async function getExpectedAuthToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return sha256Hex(password);
}

export function isPasswordProtectionEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function checkPassword(input: string): boolean {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  return input === password;
}
