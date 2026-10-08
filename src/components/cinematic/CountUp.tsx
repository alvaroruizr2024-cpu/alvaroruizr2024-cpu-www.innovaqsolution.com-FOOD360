import React, { useEffect, useRef } from 'react';
import { animate, useInView } from 'motion/react';
import { useReducedMotion } from '../../lib/motion';

/** Animates numeric part of strings like "68.4%", "€420", "100%". */
export function CountUp({ value, duration = 1.6 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const m = value.match(/^([^\d-]*)(-?[\d.]+)(.*)$/);

  useEffect(() => {
    if (!m || !inView || reduced) return;
    const [, pre, num, post] = m;
    const dec = (num.split('.')[1] || '').length;
    const c = animate(0, parseFloat(num), {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = `${pre}${v.toFixed(dec)}${post}`; },
    });
    return () => c.stop();
  }, [inView, reduced, value]);

  return <span ref={ref}>{value}</span>;
}
