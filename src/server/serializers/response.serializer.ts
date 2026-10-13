/**
 * Serializes Prisma BigInt and Decimal instances safely for JSON response payloads.
 */
export function serializeForClient<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value && typeof value === 'object' && 'isDecimal' in value) {
        return Number(value.toString());
      }
      return value;
    })
  );
}
