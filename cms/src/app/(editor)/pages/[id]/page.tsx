import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getLayout } from "@/lib/layouts";
import { LayoutEditor } from "@/components/editor/LayoutEditor";

type Props = { params: Promise<{ id: string }> };

export default async function EditPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/");

  const { id } = await params;
  const layout = await getLayout(id);
  if (!layout) notFound();

  return (
    <LayoutEditor
      initial={{
        id: layout.id,
        name: layout.name,
        width: layout.width,
        height: layout.height,
        backgroundColor: layout.backgroundColor,
        backgroundImage: layout.backgroundImage,
        theme: layout.theme,
        elements: layout.elements.map((el) => ({
          id: el.id,
          type: el.type as "text" | "image",
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
          imageUrl: el.imageUrl,
          objectFit: el.objectFit,
        })),
      }}
    />
  );
}
