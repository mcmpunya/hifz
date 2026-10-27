/** Arabic-Indic digits and misc helpers */

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(n: number | string): string {
  return String(n)
    .split("")
    .map((ch) => (/\d/.test(ch) ? AR_DIGITS[Number(ch)] : ch))
    .join("");
}

/** Split ayah text into display words (keeping text intact) */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}
