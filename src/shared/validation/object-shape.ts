export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const keys = Object.keys(value);
  if (!(
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key))
  )) {
    return false;
  }

  for (const key in value) {
    if (!Object.hasOwn(value, key)) {
      return false;
    }
  }

  return true;
};
