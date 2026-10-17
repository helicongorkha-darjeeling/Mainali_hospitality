/** Optional title before the guest's name. Empty = no title (we never guess one). */
export const titles = ["", "Mr", "Ms", "Mrs", "Dr"] as const;
export type Title = (typeof titles)[number];

/** "helicon gorkha" → "Helicon Gorkha" (keeps names like "McDonald" or "D'Souza" as typed after the first letter). */
export const tidyName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/** "Mr. Helicon Gorkha" */
export const fullName = (title: string, name: string) => [title && `${title}.`, tidyName(name)].filter(Boolean).join(" ");

/** "Mr. Helicon" (title + first name), or just "Helicon" without a title. */
export const greetingName = (title: string, name: string) => {
  const first = tidyName(name).split(" ")[0] ?? "";
  return [title && `${title}.`, first].filter(Boolean).join(" ");
};
