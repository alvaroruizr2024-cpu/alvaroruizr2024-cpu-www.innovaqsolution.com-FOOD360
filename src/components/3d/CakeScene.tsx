import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const TIERS = [
  { r: 1.55, h: 0.62, y: 0, color: '#f6ead7' },
  { r: 1.1, h: 0.55, y: 0.62, color: '#065f46' },
  { r: 0.72, h: 0.5, y: 1.17, color: '#f6ead7' },
];

function Tier({ i, exploded, onPick }: { i: number; exploded: boolean; onPick: () => void }) {
  const t = TIERS[i];
  const ref = useRef<THREE.Group>(null!);
  const [hover, setHover] = useState(false);
  useFrame((_, dt) => {
    const target = t.y + (exploded ? i * 0.55 : 0) + (hover ? 0.12 : 0);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, target, 5, dt);
    ref.current.rotation.y += dt * (hover ? 1.4 : 0.12) * (i % 2 ? -1 : 1);
  });
  return (
    <group
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      onClick={(e) => { e.stopPropagation(); onPick(); }}
    >
      <mesh position={[0, t.h / 2, 0]} castShadow>
        <cylinderGeometry args={[t.r, t.r, t.h, 64]} />
        <meshPhysicalMaterial color={t.color} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} emissive={t.color} emissiveIntensity={hover ? 0.25 : 0} />
      </mesh>
      {/* cream rim */}
      <mesh position={[0, t.h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[t.r - 0.03, 0.06, 16, 64]} />
        <meshPhysicalMaterial color="#fffaf0" roughness={0.3} clearcoat={1} />
      </mesh>
      {/* gold band */}
      <mesh position={[0, t.h * 0.18, 0]}>
        <cylinderGeometry args={[t.r + 0.012, t.r + 0.012, 0.06, 64]} />
        <meshStandardMaterial color="#d4a017" metalness={1} roughness={0.2} />
      </mesh>
      {/* cream pearls */}
      {Array.from({ length: Math.round(t.r * 14) }).map((_, k, a) => {
        const ang = (k / a.length) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(ang) * (t.r + 0.02), t.h * 0.78, Math.sin(ang) * (t.r + 0.02)]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshPhysicalMaterial color="#fffaf0" roughness={0.25} clearcoat={1} />
          </mesh>
        );
      })}
    </group>
  );
}

function Cherry({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} floatIntensity={0.25} rotationIntensity={0.2}>
      <group position={position}>
        <mesh castShadow>
          <sphereGeometry args={[0.17, 32, 32]} />
          <meshPhysicalMaterial color="#b3122b" roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
        <mesh position={[0.04, 0.26, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
          <meshStandardMaterial color="#365314" />
        </mesh>
      </group>
    </Float>
  );
}

function Orbiters({ count = 28 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      r: 2.3 + Math.random() * 1.3,
      y: -0.2 + Math.random() * 3,
      s: 0.4 + Math.random() * 0.8,
      p: Math.random() * Math.PI * 2,
      size: 0.04 + Math.random() * 0.05,
      gold: i % 3 === 0,
    })),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const a = d.p + t * d.s * 0.4;
      dummy.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * d.s + d.p) * 0.2, Math.sin(a) * d.r);
      dummy.rotation.set(t * d.s, t * 0.5, 0);
      dummy.scale.setScalar(d.size * 4);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      ref.current.setColorAt(i, color.set(d.gold ? '#d4a017' : '#10b981'));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial metalness={0.9} roughness={0.2} />
    </instancedMesh>
  );
}

function Rig({ children, autoRotate }: { children: React.ReactNode; autoRotate: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ pointer, clock }, dt) => {
    const g = ref.current;
    const base = autoRotate ? clock.elapsedTime * 0.25 : 0;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, base + pointer.x * 0.9, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.25, 3, dt);
  });
  return <group ref={ref}>{children}</group>;
}

function CameraRig({ intro }: { intro: boolean }) {
  useFrame(({ camera, pointer, clock }, dt) => {
    const t = Math.min(clock.elapsedTime / 2.2, 1);
    const e = 1 - Math.pow(1 - t, 3);
    const dist = intro ? THREE.MathUtils.lerp(11, 6.6, e) : 6.6;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.8, 2.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 2.2 + pointer.y * 0.5, 2.5, dt);
    camera.position.z = dist;
    camera.lookAt(0, 0.1, 0);
  });
  return null;
}

export default function CakeScene({ intro = false, reduced = false }: { intro?: boolean; reduced?: boolean }) {
  const [exploded, setExploded] = useState(false);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.2, 8], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => setExploded(false)}
      aria-label="Tarta 3D interactiva: arrastra o mueve el cursor para girar, haz clic para separar los pisos"
    >
      <CameraRig intro={intro && !reduced} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 3]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 2, -2]} intensity={25} color="#d4a017" />
      <pointLight position={[3, 1, 4]} intensity={12} color="#10b981" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} scale={[3, 6, 1]} color="#d4a017" />
        <Lightformer form="ring" intensity={2} position={[5, 2, 2]} scale={4} color="#10b981" />
      </Environment>

      <Float speed={reduced ? 0 : 1.4} floatIntensity={reduced ? 0 : 0.5} rotationIntensity={0}>
        <Rig autoRotate={!reduced}>
          <group position={[0, -0.8, 0]} onClick={() => setExploded((v) => !v)}>
            {TIERS.map((_, i) => (
              <Tier key={i} i={i} exploded={exploded} onPick={() => setExploded((v) => !v)} />
            ))}
            <group position={[0, 1.67 + (exploded ? 1.1 : 0), 0]}>
              <Cherry position={[0, 0.17, 0]} />
              <Cherry position={[0.32, 0.12, 0.1]} />
              <Cherry position={[-0.25, 0.12, -0.2]} />
            </group>
            {!reduced && <Orbiters />}
          </group>
        </Rig>
      </Float>

      {!reduced && <Sparkles count={60} scale={[7, 4, 7]} size={2.5} speed={0.35} color="#d4a017" />}
      <ContactShadows position={[0, -0.82, 0]} opacity={0.55} scale={10} blur={2.6} far={3} color="#000" />
    </Canvas>
  );
}
