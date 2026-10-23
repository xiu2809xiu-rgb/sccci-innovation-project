/**
 * An uploaded file's name, safe to show and to keep in the audit log: the
 * last path segment only (a browser may send a Windows path), and letters,
 * digits, dots, dashes, underscores and spaces only, so no control or
 * direction-changing character gets through.
 */
export function safeFileName(name: string, fallback = 'file'): string {
  const base = name.split(/[\\/]/).pop() ?? fallback;
  return base.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || fallback;
}
