import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { requireSession, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    assets.map((a) => ({ ...a, url: `/uploads/${a.filename}` })),
  );
}

export async function POST(req: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("file required");

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".bin";
  const filename = `${Date.now()}_${randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);

  const asset = await prisma.mediaAsset.create({
    data: {
      name: file.name,
      filename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: bytes.length,
    },
  });

  return NextResponse.json({ ...asset, url: `/uploads/${filename}` });
}
