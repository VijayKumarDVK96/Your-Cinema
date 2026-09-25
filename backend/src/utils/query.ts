export function parseNumber(val: any, defaultVal?: number): number | undefined {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

export function parseInteger(val: any, defaultVal?: number): number | undefined {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = parseInt(String(val), 10);
  return isNaN(num) ? defaultVal : num;
}

export function parseBoolean(val: any): boolean | undefined {
  if (val === 'true' || val === true || val === 1 || val === '1') return true;
  if (val === 'false' || val === false || val === 0 || val === '0') return false;
  return undefined;
}

export function parsePagination(query: any, defaultLimit = 50): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInteger(query.page, 1) || 1);
  const limit = Math.max(1, Math.min(parseInteger(query.limit, defaultLimit) || defaultLimit, 1000));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
