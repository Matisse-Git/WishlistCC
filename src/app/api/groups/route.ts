import { prisma } from "@/lib/db";
import { listGroups } from "@/lib/groups";
import { groupCreateSchema } from "@/lib/validation";
import { ok, validationError, badRequest } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const groups = await listGroups();
  return ok(groups);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = groupCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const group = await prisma.group.create({
      data: { name: parsed.data.name, color: parsed.data.color ?? null },
    });
    return ok(group, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return badRequest("A group with that name already exists.");
    }
    throw err;
  }
}
