import { supabase } from "@/integrations/supabase/client";

const BUCKET = "evidencias";

/** Extracts the storage path from either a stored path or a legacy public/signed URL. */
export function extractEvidenciaPath(stored: string): string {
  if (!stored) return "";
  const marker = `/${BUCKET}/`;
  const idx = stored.indexOf(marker);
  if (idx >= 0) {
    const rest = stored.slice(idx + marker.length);
    return rest.split("?")[0];
  }
  return stored;
}

/** Returns a fresh signed URL for an evidence file, valid 1 hour by default. */
export async function getEvidenciaSignedUrl(
  stored: string,
  expiresIn = 3600
): Promise<string | null> {
  const path = extractEvidenciaPath(stored);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Fetches a signed URL and opens it in a new tab. */
export async function openEvidencia(stored: string): Promise<void> {
  const url = await getEvidenciaSignedUrl(stored);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}