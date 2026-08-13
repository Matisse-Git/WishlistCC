import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function ok<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    { error: "Validation failed", details: error.flatten().fieldErrors },
    { status: 400 }
  );
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Something went wrong") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": Math.ceil(retryAfterMs / 1000).toString() } }
  );
}

export function requestKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "local";
}
