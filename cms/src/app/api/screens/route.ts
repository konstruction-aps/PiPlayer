import { prisma } from "@/lib/db";
import { generatePairingCode } from "@/lib/auth";
import { requireSession, jsonOk } from "@/lib/api";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const screens = await prisma.screen.findMany({
    orderBy: { updatedAt: "desc" },
    include: { layout: { select: { id: true, name: true } } },
  });
  return jsonOk(screens);
}

export async function POST(req: Request) {
  const { error } = await requireSession();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "New screen").trim() || "New screen";
  const layoutId = body.layoutId ? String(body.layoutId) : null;

  let code = generatePairingCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.screen.findUnique({ where: { pairingCode: code } });
    if (!clash) break;
    code = generatePairingCode();
  }

  const screen = await prisma.screen.create({
    data: {
      name,
      location: body.location ? String(body.location) : null,
      pairingCode: code,
      status: "pairing",
      layoutId,
    },
    include: { layout: { select: { id: true, name: true } } },
  });
  return jsonOk(screen, { status: 201 });
}
