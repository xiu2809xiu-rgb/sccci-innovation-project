/**
 * Data minimisation at the boundary: a full bank account number never leaves
 * the adapter, not even into the stored source record. Only the last four
 * digits survive, which is all the master keeps (facts sheet section 6).
 */
export function maskAccountNumber(value: unknown): unknown {
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 4 ? `••••${digits.slice(-4)}` : '••••';
}
