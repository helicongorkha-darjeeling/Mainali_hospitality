"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Image as DreiImage } from "@react-three/drei";
import * as THREE from "three";
import { gallery } from "@/content/site";
import { useInView } from "./useInView";

const GAP = 3.4;

type Props = { track: React.RefObject<HTMLElement | null>; onProgress?: (p: number) => void };

function progressOf(el: HTMLElement | null) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
}

function Frames({ track, onProgress }: Props) {
  const { viewport, camera } = useThree();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const narrow = viewport.width < 5;
  const smooth = useRef(0);

  const items = useMemo(
    () =>
      gallery.map((g, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const w = narrow ? 1.9 : 2.1;
        return {
          ...g,
          w,
          h: w * g.ratio,
          x: side * (narrow ? 0.55 : 1.55 + ((i * 37) % 7) / 14),
          y: (((i * 53) % 9) / 9 - 0.5) * (narrow ? 0.6 : 1.1),
          z: -7 - i * GAP,
          rot: side * -0.12,
        };
      }),
    [narrow],
  );
  const endZ = items[items.length - 1].z;

  useFrame(({ pointer }) => {
    const p = progressOf(track.current);
    smooth.current += (p - smooth.current) * 0.08;
    onProgress?.(smooth.current);
    camera.position.z = 4 + smooth.current * (endZ - 4 + 1.5);
    camera.position.x += (pointer.x * 0.4 - camera.position.x) * 0.05;
    camera.position.y += (pointer.y * 0.25 - camera.position.y) * 0.05;

    refs.current.forEach((m, i) => {
      if (!m) return;
      const d = items[i].z - camera.position.z; // negative = ahead of camera
      const ahead = -d;
      // fade in from the fog, fade out just before passing the camera
      const o = THREE.MathUtils.clamp((14 - ahead) / 6, 0, 1) * THREE.MathUtils.clamp((ahead - 0.6) / 1.6, 0, 1);
      const mat = m.material as THREE.ShaderMaterial & { opacity: number; zoom: number; grayscale: number };
      mat.opacity = o;
      mat.zoom = 1 + THREE.MathUtils.clamp(1 - ahead / 8, 0, 1) * 0.15;
      mat.grayscale = THREE.MathUtils.clamp((ahead - 5) / 8, 0, 1) * 0.8;
      m.visible = o > 0.001;
    });
  });

  return (
    <>
      {items.map((it, i) => (
        <DreiImage
          key={it.src}
          ref={(m: THREE.Mesh | null) => {
            refs.current[i] = m;
          }}
          url={it.src}
          scale={[it.w, it.h]}
          position={[it.x, it.y, it.z]}
          rotation={[0, it.rot, 0]}
          transparent
          radius={0.04}
          toneMapped={false}
        />
      ))}
    </>
  );
}

export default function GalleryScene(props: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="absolute inset-0">
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={["#12100d", 6, 18]} />
        <Suspense fallback={null}>
          <Frames {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
