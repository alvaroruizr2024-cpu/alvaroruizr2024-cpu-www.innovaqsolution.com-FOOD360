import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Scene3D } from '../3d/Scene3D';
import { ease, useReducedMotion } from '../../lib/motion';

const KEY = 'food360-intro-seen';

function seen() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function Intro() {
  const [open, setOpen] = useState(() => !seen());
  const reduced = useReducedMotion();

  const close = () => {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const word = 'FOOD360'.split('');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="intro"
          role="dialog"
          aria-label="Bienvenida FOOD360"
          className="fixed inset-0 z-[100] bg-[#050505] text-white overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08, filter: 'blur(14px)' }}
          transition={{ duration: reduced ? 0.01 : 0.9, ease }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,95,70,0.35),transparent_60%)]" />
          <div className="absolute inset-x-0 top-[6vh] bottom-[34vh]"><Scene3D intro /></div>

          {/* cinematic letterbox bars */}
          <motion.div className="absolute top-0 inset-x-0 bg-black z-10" initial={{ height: '50vh' }} animate={{ height: '9vh' }} transition={{ duration: 1.6, ease, delay: 0.2 }} />
          <motion.div className="absolute bottom-0 inset-x-0 bg-black z-10" initial={{ height: '50vh' }} animate={{ height: '9vh' }} transition={{ duration: 1.6, ease, delay: 0.2 }} />

          <div className="absolute inset-x-0 bottom-[14vh] z-20 flex flex-col items-center text-center px-6 pointer-events-none">
            <motion.p
              className="text-[11px] tracking-[0.5em] uppercase text-[#d4a017] mb-3"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.8, ease }}
            >
              InnovaQ Solutions · ERP Repostería Premium
            </motion.p>
            <h1 className="flex text-6xl md:text-8xl font-black tracking-tight" aria-label="FOOD360">
              {word.map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className={i >= 4 ? 'text-[#d4a017]' : ''}
                  initial={{ opacity: 0, y: 60, rotateX: -90, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 1.0 + i * 0.07, duration: 0.9, ease }}
                  style={{ display: 'inline-block', transformOrigin: '50% 100%' }}
                >
                  {ch}
                </motion.span>
              ))}
            </h1>
            <motion.button
              onClick={close}
              className="pointer-events-auto mt-8 group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 backdrop-blur px-7 py-3 text-sm font-medium hover:bg-[#065f46] hover:border-[#065f46] focus-visible:outline-2 focus-visible:outline-[#d4a017] transition-colors"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.0, duration: 0.7, ease }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            >
              Entrar al sistema
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <motion.p className="mt-4 text-xs text-white/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>
              Mueve el cursor para girar · clic en la tarta para separar los pisos
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
