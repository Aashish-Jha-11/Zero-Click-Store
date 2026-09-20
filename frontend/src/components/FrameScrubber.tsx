'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-scrubbed image sequence.
 *
 * Seeking an <video> works locally but not on a CDN: every forward seek is a
 * range request, so scrolling down lags on unbuffered frames while scrolling
 * back up hits cache. Preloading a frame sequence and painting to a canvas has
 * no seek at all — once loaded, every frame is instant.
 */
export default function FrameScrubber({
  count,
  src,
  progressRef,
  onReady,
  className,
}: {
  count: number;
  /** Builds a frame URL, 1-based. */
  src: (i: number) => string;
  /** Live scroll progress, 0..1, read every animation frame. */
  progressRef: React.RefObject<number>;
  onReady?: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let done = 0;

    const paint = (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // object-fit: cover
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };

    for (let i = 1; i <= count; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src(i);
      img.onload = () => {
        if (cancelled) return;
        done += 1;
        setLoaded(done);
        // Paint the very first frame the moment it exists, so the hero is
        // never blank while the rest of the sequence streams in.
        if (i === 1) paint(img);
        if (done === count) onReady?.();
      };
      images[i - 1] = img;
    }
    framesRef.current = images;

    let raf: number | null = null;
    let lastIndex = -1;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = Math.min(1, Math.max(0, progressRef.current ?? 0));
      const idx = Math.min(count - 1, Math.round(p * (count - 1)));
      if (idx === lastIndex) return;

      const img = framesRef.current[idx];
      // Hold the previous frame rather than flashing if this one is still in
      // flight; it will be painted on a later tick.
      if (!img?.complete || img.naturalWidth === 0) return;
      lastIndex = idx;
      paint(img);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      const img = framesRef.current[Math.max(0, lastIndex)];
      if (img?.complete) paint(img);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [count, src, progressRef, onReady]);

  return (
    <>
      <canvas ref={canvasRef} className={className} aria-hidden />
      {loaded < count && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-white/50 transition-[width] duration-200"
            style={{ width: `${(loaded / count) * 100}%` }}
          />
        </div>
      )}
    </>
  );
}
