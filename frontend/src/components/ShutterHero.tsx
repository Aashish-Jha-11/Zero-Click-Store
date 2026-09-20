'use client';

import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import FrameScrubber from './FrameScrubber';

/* ────────────────────────────────────────────────────────────────
   Scroll timeline. Tweak these and everything else follows.
   ──────────────────────────────────────────────────────────────── */
const SHUTTER_LIFT: [number, number] = [0.0, 0.55]; // shutter rolls up
const INTERIOR_FADE: [number, number] = [0.3, 0.68]; // store becomes visible
const CAMERA_PUSH: [number, number] = [0.5, 0.95]; // dolly into the shop
const HANDOFF: [number, number] = [0.86, 1.0]; // dissolve to the app

const PIN_HEIGHT = '260vh';

interface ShutterHeroProps {
  /** Number of frames in the scrubbed sequence (public/frames/fNNN.jpg). */
  frameCount?: number;
  poster?: string;
  children?: React.ReactNode;
}

const frameUrl = (i: number) => `/frames/f${String(i).padStart(3, '0')}.jpg`;

/* ── The kirana interior, built entirely in CSS ───────────────── */

const SHELF_ITEMS = [
  ['#e4572e', '#f4a259', '#e4572e', '#2e5eaa', '#f4d35e', '#e4572e', '#8ac926'],
  ['#f4d35e', '#2e5eaa', '#8ac926', '#e4572e', '#f4a259', '#2e5eaa', '#f4d35e'],
  ['#8ac926', '#e4572e', '#f4d35e', '#f4a259', '#2e5eaa', '#8ac926', '#e4572e'],
  ['#2e5eaa', '#f4a259', '#e4572e', '#f4d35e', '#8ac926', '#f4a259', '#2e5eaa'],
];

function StoreInterior() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1008]">
      {/* warm light pooling from the ceiling */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 18%, rgba(255,196,110,0.55) 0%, rgba(120,70,25,0.30) 42%, rgba(18,10,4,0.96) 78%)',
        }}
      />

      {/* back wall of shelving */}
      <div className="absolute inset-x-0 top-[8%] bottom-[26%] flex flex-col justify-between px-[6%]">
        {SHELF_ITEMS.map((row, r) => (
          <div key={r} className="relative">
            <div className="flex items-end justify-between gap-[0.6%]">
              {row.map((color, i) => {
                const h = 38 + ((i * 7 + r * 11) % 26);
                const w = 7 + ((i * 5 + r * 3) % 5);
                return (
                  <div
                    key={i}
                    className="rounded-[3px]"
                    style={{
                      width: `${w}%`,
                      height: `${h}px`,
                      background: `linear-gradient(170deg, ${color} 0%, ${color}cc 55%, rgba(0,0,0,0.45) 100%)`,
                      boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
                    }}
                  />
                );
              })}
            </div>
            {/* the shelf plank */}
            <div
              className="mt-1 h-[6px] w-full rounded-sm"
              style={{
                background: 'linear-gradient(180deg, #8a5a2b 0%, #5c3a1a 60%, #33200e 100%)',
                boxShadow: '0 6px 14px rgba(0,0,0,0.55)',
              }}
            />
          </div>
        ))}
      </div>

      {/* counter */}
      <div
        className="absolute inset-x-0 bottom-0 h-[24%]"
        style={{
          background: 'linear-gradient(180deg, #6b421f 0%, #4a2c13 35%, #241407 100%)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.65)',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[10px]"
          style={{ background: 'linear-gradient(180deg, #a06a33 0%, #6b421f 100%)' }}
        />
        {/* weighing scale silhouette */}
        <div className="absolute left-[14%] top-[-34px] flex flex-col items-center">
          <div className="h-[5px] w-[62px] rounded-full bg-[#c9a227] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <div className="h-[26px] w-[7px] bg-[#8a6f1c]" />
          <div className="h-[7px] w-[40px] rounded-sm bg-[#6b5416]" />
        </div>
        {/* jars */}
        {[30, 44, 58].map((left, i) => (
          <div
            key={i}
            className="absolute top-[-42px] w-[34px] rounded-t-md rounded-b-sm"
            style={{
              left: `${left}%`,
              height: `${42 + i * 4}px`,
              background:
                'linear-gradient(170deg, rgba(255,232,180,0.55) 0%, rgba(210,160,90,0.4) 50%, rgba(90,60,25,0.6) 100%)',
              border: '1px solid rgba(255,220,160,0.35)',
              boxShadow: 'inset 0 6px 10px rgba(255,235,190,0.3)',
            }}
          />
        ))}
      </div>

      {/* dust motes in the light */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-brand-100/60"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${(i * 37) % 100}%`,
            top: `${12 + ((i * 23) % 62)}%`,
          }}
          animate={{ y: [0, -22, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── The corrugated steel shutter ─────────────────────────────── */

function Shutter({ scaleY }: { scaleY: MotionValue<number> }) {
  return (
    <motion.div
      className="absolute inset-0 origin-top will-change-transform"
      style={{ scaleY }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            repeating-linear-gradient(
              180deg,
              #b9bdc2 0px, #d7dbdf 3px, #9aa0a6 9px, #7e858b 11px, #b9bdc2 13px
            )`,
        }}
      />
      {/* raking morning light from the left */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(255,214,150,0.45) 0%, rgba(255,255,255,0.10) 26%, rgba(0,0,0,0.18) 62%, rgba(0,0,0,0.42) 100%)',
        }}
      />
      {/* wear + grime */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          background:
            'radial-gradient(circle at 22% 72%, #000 0%, transparent 26%), radial-gradient(circle at 78% 34%, #000 0%, transparent 22%), radial-gradient(circle at 48% 88%, #000 0%, transparent 30%)',
        }}
      />
      {/* bottom rail */}
      <div
        className="absolute inset-x-0 bottom-0 h-[18px]"
        style={{
          background: 'linear-gradient(180deg, #6f767c 0%, #454b50 55%, #2b3034 100%)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.55)',
        }}
      />
    </motion.div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────── */

export default function ShutterHero({ frameCount, poster, children }: ShutterHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Read by the scrubber every animation frame — a ref, not state, so scroll
  // never triggers a React render.
  const progressRef = useRef(0);
  const reduced = useReducedMotion();
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Progress is computed from the section's own rect rather than from a
  // library measurement, so there is nothing to mis-measure or go stale.
  const progress = useMotionValue(0);

  const shutterScaleY = useTransform(progress, SHUTTER_LIFT, [1, 0]);
  const interiorOpacity = useTransform(progress, INTERIOR_FADE, [0, 1]);
  const cameraScale = useTransform(progress, CAMERA_PUSH, [1, 1.38]);
  const heroOpacity = useTransform(progress, HANDOFF, [1, 0]);
  const titleOpacity = useTransform(progress, [0, 0.18], [1, 0]);
  const hintOpacity = useTransform(progress, [0, 0.12], [1, 0]);

  useEffect(() => {
    const section = ref.current;
    if (!section || reduced) return;

    let raf: number | null = null;

    const apply = () => {
      raf = null;
      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const p = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      progressRef.current = p;
      progress.set(p);
    };

    const schedule = () => {
      if (raf === null) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    apply();

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [progress, reduced]);

  const useFrames = Boolean(frameCount) && !videoFailed;


  /* Reduced motion: one static frame, no pinning, no scrubbing. */
  if (reduced) {
    return (
      <section className="relative h-screen w-full overflow-hidden">
        <StoreInterior />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <HeroCopy />
        </div>
        <div className="absolute inset-x-0 bottom-0">{children}</div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative w-full" style={{ height: PIN_HEIGHT }}>
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden bg-[#12100e]"
        style={{ opacity: heroOpacity }}
      >
        {/* camera rig — everything inside pushes in together */}
        <motion.div className="absolute inset-0 will-change-transform" style={{ scale: cameraScale }}>
          {useFrames ? (
            <FrameScrubber
              count={frameCount!}
              src={frameUrl}
              progressRef={progressRef}
              onReady={() => setVideoReady(true)}
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <>
              <motion.div className="absolute inset-0" style={{ opacity: interiorOpacity }}>
                <StoreInterior />
              </motion.div>
              <Shutter scaleY={shutterScaleY} />
            </>
          )}
        </motion.div>

        {/* vignette keeps the copy readable over any frame */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.62)_100%)]" />

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: titleOpacity }}
        >
          <HeroCopy />
        </motion.div>

        <motion.div
          className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3"
          style={{ opacity: hintOpacity }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2.5"
          >
            <span className="rounded-full bg-white/12 px-5 py-2.5 text-[0.8125rem] font-semibold tracking-wide text-white backdrop-blur-sm ring-1 ring-white/25">
              Scroll down to open the shop
            </span>
            <ChevronDown className="h-6 w-6 text-white/80" strokeWidth={2.4} />
          </motion.div>
        </motion.div>
      </motion.div>

      {children}
    </section>
  );
}

function HeroCopy() {
  return (
    <>
      <motion.img
        src="/mark.png"
        alt=""
        initial={{ opacity: 0, y: 14, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 h-16 w-16 object-contain drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] sm:h-20 sm:w-20"
      />
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-5xl font-bold tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.7)] sm:text-7xl"
      >
        Dukaan<span className="text-brand-400">Pilot</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 max-w-md text-base text-white/75 sm:text-lg"
      >
        Your kirana&apos;s autonomous store operator.
      </motion.p>
    </>
  );
}
