import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../lib/motion';
import { useTheme } from '../../contexts/ThemeContext';

/** Lightweight canvas particle field with mouse repulsion and connecting lines. */
export function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { theme } = useTheme();

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const mouse = { x: -999, y: -999 };
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const N = Math.min(70, Math.floor((w * h) / 22000));
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 1.6, gold: Math.random() < 0.3,
    }));
    const dark = theme === 'dark';
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * 0.6; p.vx += (dx / Math.sqrt(d2 + 1)) * f * 0.15; p.vy += (dy / Math.sqrt(d2 + 1)) * f * 0.15; }
        p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i];
        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.strokeStyle = `rgba(6,95,70,${(1 - d / 120) * (dark ? 0.35 : 0.2)})`;
            ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = a.gold ? 'rgba(212,160,23,0.7)' : 'rgba(16,185,129,0.6)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    const mv = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; };
    window.addEventListener('pointermove', mv);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', mv); window.removeEventListener('resize', resize); };
  }, [reduced, theme]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />;
}
