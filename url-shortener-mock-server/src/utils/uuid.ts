const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Source of the UUID pattern, for the login page's browser script (it cannot import this module). */
export const UUID_PATTERN_SOURCE = UUID_PATTERN.source;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
