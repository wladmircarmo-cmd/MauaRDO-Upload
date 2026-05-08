import sharp from "sharp";

export async function compressAndNormalizeImage(params: {
  bytes: Uint8Array;
  maxWidth: number;
  jpegQuality: number; // 0..1
}) {
  const quality = Math.round(params.jpegQuality * 100);

  const output = await sharp(params.bytes)
    .rotate()
    .resize({ width: params.maxWidth, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  return {
    bytes: new Uint8Array(output),
    mimeType: "image/jpeg" as const,
    ext: "jpg" as const,
  };
}

