import { prisma } from "@/lib/db";
import { PicturesUploader } from "@/components/PicturesUploader";

export default async function PicturesPage() {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Pictures</h1>
          <p className="muted">Upload photos here, or drop them straight onto a page in the editor.</p>
        </div>
      </div>
      <PicturesUploader
        initial={assets.map((a) => ({
          id: a.id,
          name: a.name,
          url: `/uploads/${a.filename}`,
          mimeType: a.mimeType,
        }))}
      />
    </main>
  );
}
