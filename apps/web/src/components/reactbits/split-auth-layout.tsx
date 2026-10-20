/*
 * React Bits Pro block auth-4 ("Split sign-in with an orbital trust ring", @reactbits-pro/auth-4,
 * licensed): the split card frame. Adapted for HuiTong: heading, form, footnote and aside passed in
 * (the block hard-codes them), a SpotlightCard surface, design tokens instead of the neutral scale,
 * 250 ms entrances that are skipped under reduced motion, and the aside stacked under the form on
 * narrow screens instead of hidden, so phones and tablets still see what the product is.
 */
'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

import { SpotlightCard } from '@/components/reactbits/spotlight-card';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const column: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

export interface SplitAuthLayoutProps {
  heading: ReactNode;
  /** The form and anything that belongs with it. */
  children: ReactNode;
  footnote?: ReactNode;
  aside: ReactNode;
}

/** A two-column sign-in card: the form on one side, the product story on the other. */
export function SplitAuthLayout({ heading, children, footnote, aside }: SplitAuthLayoutProps) {
  const reduce = useReducedMotion() === true;

  return (
    <SpotlightCard className="grid p-0 lg:min-h-176 lg:grid-cols-2" intensity={0.08} proximity={40}>
      <motion.div
        initial={reduce ? false : 'hidden'}
        animate="visible"
        variants={column}
        className="flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10"
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-10">
          <div className="flex flex-1 flex-col justify-center gap-6">
            <motion.div variants={item}>{heading}</motion.div>
            <motion.div variants={item}>{children}</motion.div>
          </div>
          {footnote ? <motion.div variants={item}>{footnote}</motion.div> : null}
        </div>
      </motion.div>
      <motion.aside
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.1, ease: EASE_OUT }}
        className="relative flex flex-col overflow-hidden border-t border-border bg-muted lg:border-t-0 lg:border-l"
      >
        {aside}
      </motion.aside>
    </SpotlightCard>
  );
}
