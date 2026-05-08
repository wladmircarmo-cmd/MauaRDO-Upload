import { z } from "zod";
import { getWbsList } from "@/lib/wbs";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export const uploadSchema = z.object({
  wbs: z
    .string()
    .min(1)
    .regex(/^\d+(?:\.\d+)+$/, "WBS inválido"),
  description: z.string().optional().nullable(),
  cc: z.string().min(1, "CC é obrigatório"),
  os: z.string().min(1, "OS é obrigatória"),
  date: z.string().min(1, "Data é obrigatória"),
});

export function assertWbsExists(wbs: string) {
  const wbsList = getWbsList();
  if (!wbsList.some((entry) => entry.wbs === wbs)) {
    throw new Error("WBS não existe na lista");
  }
}

export function assertValidFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Tipo de arquivo inválido. Use JPG, PNG ou WEBP.");
  }
  if (file.size <= 0) {
    throw new Error("Arquivo inválido.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Arquivo excede 10MB.");
  }
}

export function normalizeWbs(wbs: string) {
  return wbs.replaceAll(".", "-");
}

