'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.28, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
