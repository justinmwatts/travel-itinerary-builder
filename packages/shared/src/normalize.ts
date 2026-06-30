// Normalization shared by search indexing, query matching and destination
// reconciliation. Strips accents and lowercases so "São Paulo" and "Sao Paulo"
// match (design.md sections 8 and 14). Keeping this in the shared package means
// the API indexes, searches and reconciles with exactly the same rule.

export function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Used to match an incoming AI destination to an existing row during chat
// reconciliation, preserving the creator note and resolved cover.
export function normalizeName(name: string): string {
  return foldAccents(name.trim().toLowerCase());
}

// The indexed `searchText` on a destination: lowercased, accent-folded name
// plus country. Search queries are normalized the same way before matching.
export function buildSearchText(name: string, country: string): string {
  return foldAccents(`${name} ${country}`.trim().toLowerCase());
}
