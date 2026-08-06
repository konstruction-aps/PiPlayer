import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { getLayout, serializeLayoutForPlayer } from "@/lib/layouts";

type Ctx = { params: Promise<{ id: string }> };

/** Public display endpoint — browser player or preview. */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const screen = await prisma.screen.findUnique({ where: { id } });
  if (!screen) return jsonError("Screen not found", 404);

  await prisma.screen.update({
    where: { id },
    data: { status: "online", lastSeenAt: new Date() },
  });

  const origin = new URL(req.url).origin;
  const layout = screen.layoutId ? await getLayout(screen.layoutId) : null;

  return jsonOk({
    screen: { id: screen.id, name: screen.name },
    layout: layout ? serializeLayoutForPlayer(layout, origin) : null,
  });
}
