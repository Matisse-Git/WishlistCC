import { selectVariant } from "@/lib/variants";
import { ok, badRequest } from "@/lib/api-response";

// Deliberately minimal: the client applies the new selection optimistically
// and only needs a pass/fail signal back, not the full item payload — see
// VariantCard's switch handler. Keeps the hot "switch variant" path down to
// the 3 queries selectVariant() actually needs, instead of routing through
// the generic item PATCH handler's extra lookup/update/refetch.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await selectVariant(id);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Failed to switch variant");
  }
  return ok({ success: true });
}
