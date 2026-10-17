"use client";

import { useEffect, useRef, useState } from "react";

/** True while the element is on (or near) the screen. Used to pause WebGL off screen. */
export function useInView<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

/**
 * Becomes true once the element comes within `rootMargin` of the screen, and stays true.
 * Used to delay heavy downloads (3D textures) until the visitor is close to that section.
 */
export function useNearOnce(ref: React.RefObject<Element | null>, rootMargin = "100% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return near;
}
