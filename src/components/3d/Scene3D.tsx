import React, { Component, Suspense, lazy } from 'react';
import { hasWebGL, useReducedMotion } from '../../lib/motion';

const CakeScene = lazy(() => import('./CakeScene'));

class Boundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export function StaticFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#065f46] to-[#d4a017] opacity-60 blur-2xl" />
    </div>
  );
}

/** Lazy-loaded interactive 3D cake with WebGL / error fallback. */
export function Scene3D({ intro = false }: { intro?: boolean }) {
  const reduced = useReducedMotion();
  if (!hasWebGL()) return <StaticFallback />;
  return (
    <Boundary fallback={<StaticFallback />}>
      <Suspense fallback={<StaticFallback />}>
        <CakeScene intro={intro} reduced={reduced} />
      </Suspense>
    </Boundary>
  );
}
