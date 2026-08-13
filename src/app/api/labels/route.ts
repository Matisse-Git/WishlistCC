import { prisma } from "@/lib/db";
import { listLabels } from "@/lib/labels";
import { labelCreateSchema } from "@/lib/validation";
import { ok, validationError, badRequest } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const labels = await listLabels();
  return ok(labels);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = labelCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const label = await prisma.label.create({
      data: { name: parsed.data.name, color: parsed.data.color ?? null },
    });
    return ok(label, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return badRequest("A label with that name already exists.");
    }
    throw err;
  }
}
