import { DisplayPlayer } from "@/components/DisplayPlayer";

type Props = { params: Promise<{ id: string }> };

export default async function DisplayPage({ params }: Props) {
  const { id } = await params;
  return <DisplayPlayer screenId={id} />;
}
