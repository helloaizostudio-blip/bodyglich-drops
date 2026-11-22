import { readMedia } from "@/services/image-generation/renderer";

/** Serves generated pin images. Public so Zapier/Pinterest can download them. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const data = readMedia(file);
  if (!data) return new Response("Not found", { status: 404 });
  const type = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
