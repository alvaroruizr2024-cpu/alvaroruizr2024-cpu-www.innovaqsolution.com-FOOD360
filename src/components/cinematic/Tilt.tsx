import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import { useReducedMotion } from '../../lib/motion';

interface TiltProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  children: React.ReactNode;
}

/** 3D tilt card with cursor-following spotlight. */
export function Tilt({ max = 10, className = '', children, ...rest }: TiltProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const glow = useMotionTemplate`radial-gradient(260px circle at ${mx}% ${my}%, rgba(212,160,23,0.16), transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const b = ref.current!.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width;
    const y = (e.clientY - b.top) / b.height;
    ry.set((x - 0.5) * max * 2);
    rx.set(-(y - 0.5) * max * 2);
    mx.set(x * 100);
    my.set(y * 100);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      whileHover={reduced ? undefined : { scale: 1.025 }}
      className={`relative ${className}`}
      {...(rest as any)}
    >
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity" style={{ background: glow }} />
    </motion.div>
  );
}
