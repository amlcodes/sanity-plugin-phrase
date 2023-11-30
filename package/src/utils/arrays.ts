export function dedupeArray<T>(arr: T[]) {
  return Array.from(new Set(arr))
}
