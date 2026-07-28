const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generatePublicCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem caracteres ambiguos
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return code;
}
