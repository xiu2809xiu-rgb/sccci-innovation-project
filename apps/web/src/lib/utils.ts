import { createCn } from 'cn/config';

/**
 * Tailwind class joining and conflict resolution (clsx + tailwind-merge in one).
 * It is taught HuiTong's custom type sizes: without this, `text-md` and
 * `text-display` read as colours and are dropped next to `text-foreground`.
 */
export const cn = createCn({
  extend: { classGroups: { 'font-size': [{ text: ['md', 'display'] }] } },
});
