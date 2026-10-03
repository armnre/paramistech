const dateKeys = new Set(['createdAt', 'updatedAt', 'publishedAt']);

/**
 * unstable_cache stores results as JSON, so Date columns come back as ISO strings on a cache hit.
 * This restores Date objects for the known timestamp columns (recursively).
 */
export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => reviveDates(item)) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      result[key] = dateKeys.has(key) && typeof child === 'string' ? new Date(child) : reviveDates(child);
    }
    return result as T;
  }
  return value;
}
