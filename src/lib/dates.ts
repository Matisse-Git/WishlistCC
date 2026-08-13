// Fixed locale for the same reason as lib/money.ts's FORMAT_LOCALE: date
// formatting must be identical between server-rendered HTML and the
// client's first render, or React throws a hydration mismatch whenever the
// server process's locale differs from the browser's.
const FORMAT_LOCALE = "en-US";

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(FORMAT_LOCALE, { dateStyle: "short" }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(FORMAT_LOCALE, { dateStyle: "short", timeStyle: "short" }).format(date);
}
