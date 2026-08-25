import { activatePriceSource } from "@/lib/priceSources";
import { ok, badRequest } from "@/lib/api-response";

// Deliberately minimal, same reasoning as select-variant: the client applies
// the swap optimistically and only needs a pass/fail signal back.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string; sourceId: string }> }) {
  const { id, sourceId } = await params;
  try {
    await activatePriceSource(id, sourceId);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Failed to switch price source");
  }
  return ok({ success: true });
}
