import { prisma } from "./db";

export type LayoutWithElements = Awaited<
  ReturnType<typeof getLayout>
>;

export async function getLayout(id: string) {
  return prisma.layout.findUnique({
    where: { id },
    include: { elements: { orderBy: { zIndex: "asc" } } },
  });
}

export function absoluteMediaUrl(origin: string, path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function serializeLayoutForPlayer(
  layout: NonNullable<Awaited<ReturnType<typeof getLayout>>>,
  origin: string,
) {
  return {
    id: layout.id,
    name: layout.name,
    width: layout.width,
    height: layout.height,
    backgroundColor: layout.backgroundColor,
    backgroundImage: absoluteMediaUrl(origin, layout.backgroundImage),
    elements: layout.elements.map((el) => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      zIndex: el.zIndex,
      content: el.content,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      color: el.color,
      textAlign: el.textAlign,
      imageUrl: absoluteMediaUrl(origin, el.imageUrl),
      objectFit: el.objectFit,
    })),
  };
}
