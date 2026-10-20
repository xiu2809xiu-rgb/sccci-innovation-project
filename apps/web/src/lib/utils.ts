import { createCn } from 'cn/config';

/**
 * Tailwind class joining and conflict resolution (clsx + tailwind-merge in one).
 * It is taught HuiTong's custom type size: without this, `text-md` reads as a
 * colour and is dropped next to `text-foreground`.
 */
export const cn = createCn({
  extend: { classGroups: { 'font-size': [{ text: ['md'] }] } },
});
