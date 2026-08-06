import { prisma } from "@/lib/db";
import { generateDeviceToken } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { getLayout, serializeLayoutForPlayer } from "@/lib/layouts";

/** Pair a player to a screen using the 6-character code shown in the CMS. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = String(body?.code || "")
    .trim()
    .toUpperCase();
  if (code.length < 4) return jsonError("Enter the pairing code");

  const screen = await prisma.screen.findUnique({ where: { pairingCode: code } });
  if (!screen) return jsonError("Code not found", 404);

  const token = generateDeviceToken();
  const updated = await prisma.screen.update({
    where: { id: screen.id },
    data: {
      deviceToken: token,
      status: "online",
      lastSeenAt: new Date(),
    },
  });

  return jsonOk({
    screenId: updated.id,
    name: updated.name,
    deviceToken: token,
  });
}

/** Player heartbeat + fetch current page layout. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-device-token");
  if (!token) return jsonError("token required", 401);

  const screen = await prisma.screen.findUnique({ where: { deviceToken: token } });
  if (!screen) return jsonError("Unknown device", 401);

  await prisma.screen.update({
    where: { id: screen.id },
    data: { status: "online", lastSeenAt: new Date() },
  });

  const origin = url.origin;
  const layout = screen.layoutId ? await getLayout(screen.layoutId) : null;

  return jsonOk({
    screen: { id: screen.id, name: screen.name },
    layout: layout ? serializeLayoutForPlayer(layout, origin) : null,
  });
}
