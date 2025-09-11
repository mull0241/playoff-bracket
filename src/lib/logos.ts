// src/lib/logos.ts
export const logoUrl = (file: string) =>
  import.meta.env.BASE_URL + 'logos/' + file; // exact filename + case
