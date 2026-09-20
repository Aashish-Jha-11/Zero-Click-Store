# DukaanPilot — Scroll-Driven Shutter Hero

> **The shot:** a closed steel shutter fills the screen → it rolls up as you scroll →
> the lit kirana store is revealed behind it → the camera pushes in through the doorway
> → it dissolves into the live dashboard.

---

## 0. Read this first (hackathon triage)

**Do not block your demo on a generated video.**

| | Generated video (`.mp4`) | CSS/SVG shutter (shipped in `ShutterHero.tsx`) |
|---|---|---|
| Time to working | 30–90 min (queues, retries, re-rolls) | already done |
| File size | 4–15 MB | ~0 KB |
| Scroll scrubbing | janky on mobile Safari unless re-encoded | perfect, it's transform-based |
| Judge scoring | neutral | **helps** — "blazing fast" is an explicit rubric line |
| Risk of failing live | real (network, decode, autoplay policy) | none |

**Recommendation:** demo with the CSS shutter. The component already has a
`videoSrc` prop — drop an mp4 in later and it upgrades itself with zero refactor.
Category 5 (UX & Usability, 10 pts) rewards *fast and frictionless*; a 12 MB hero
video that stalls on venue wifi actively loses you points.

Generate the video **after** the core loop is locked, or overnight.

---

## 1. Where to generate it free

Availability and free-tier limits change constantly — check each before committing time.

### Tier A — best quality, limited free credits

| Tool | How to access | Notes |
|---|---|---|
| **Google Veo** (Flow) | `labs.google/flow` — sign in with Google | Best prompt adherence for camera moves. Free credits are small; Google AI Pro/Ultra plans lift them. Often the best single shot. |
| **Google AI Studio** | `aistudio.google.com` | Veo access via API/UI, free quota varies by region. |
| **Kling AI** | `klingai.com` | Daily free credits that refresh. Very good at physical motion like a rolling shutter. |
| **Hailuo / MiniMax** | `hailuoai.video` | Free daily generations. Strong camera push-ins. |
| **Runway** | `runwayml.com` | One-time free credits. Best-in-class *image-to-video*, see §3. |
| **Pika** | `pika.art` | Free credits, fast turnaround. |

### Tier B — fully free, runs on Colab/local GPU

- **Wan 2.x** — open weights, strong quality, ComfyUI workflows widely available
- **LTX-Video** — very fast, made for realtime-ish generation
- **HunyuanVideo** — heavier, high quality

Free but slow to set up. **Not worth it under 2 hours.**

### The trick that actually works

Text-to-video rarely nails a specific camera move on the first try. Instead:

1. Generate a **still image** first (Nano Banana / Imagen / Midjourney / SDXL — all have free routes)
2. Feed that still into **image-to-video** with a motion-only prompt

You control the composition completely, and the model only has to solve motion.
Far fewer re-rolls. Runway and Kling are both excellent at this.

---

## 2. The prompts

### 2.1 Single-shot prompt (text-to-video)

Paste as-is into Veo / Kling / Hailuo:

```
A cinematic locked-off shot of a closed corrugated steel roller shutter of a small
Indian kirana shop, filling the entire frame. The metal is brushed silver-grey with
fine horizontal ribs, subtle scratches, dust and a few faded paint marks. Warm
early-morning light rakes across it from the left, catching each rib.

The shutter begins to roll upward smoothly, revealing in sequence: first a sliver of
warm golden light spilling out from underneath, then wooden shelves stacked densely
with colourful Indian grocery packets, glass jars of pulses, sacks of atta and rice,
hanging strips of snack sachets, and a weighing scale on a wooden counter.

The camera then pushes slowly forward through the open shutter into the shop
interior, the warm tungsten glow filling the frame, shelves drifting past on both
sides, ending centred on the counter.

Shot on 35mm, shallow depth of field, warm amber and teal colour grade, soft
volumetric dust motes in the light beams, photorealistic, no people, no text,
no logos, no on-screen writing. Smooth continuous motion, steady camera.
```

**Negative prompt** (paste wherever the tool supports it):

```
text, letters, words, signage, watermark, logo, people, faces, hands, distorted
geometry, warping metal, flickering, jump cut, fast motion, camera shake, blur,
lens flare, cartoon, illustration, oversaturated
```

**Settings:** 16:9 · 1920×1080 · **6–8 seconds** · 24 or 30 fps · highest motion quality

---

### 2.2 Two-stage prompts (recommended — far more reliable)

**Stage A — still image** (Nano Banana / Imagen / Midjourney):

```
Photorealistic straight-on frontal shot of a closed corrugated steel roller shutter
on a small Indian kirana store at dawn. Brushed silver-grey metal with fine
horizontal ribs, weathered texture, light scratches, a faint chalk mark. Warm golden
morning light rakes from the left. Shallow depth of field, 35mm, cinematic amber and
teal grade. The shutter fills the entire frame edge to edge. No text, no signage,
no people. 16:9.
```

**Stage B — motion only** (Runway / Kling image-to-video, using Stage A as input):

```
The steel roller shutter rolls smoothly upward, revealing a warmly lit kirana shop
interior packed with colourful grocery shelves. The camera then pushes slowly and
steadily forward through the opening into the shop. Continuous smooth motion,
locked horizon, no camera shake, no cuts.
```

---

### 2.3 If you want three separate clips

Generate independently and concatenate — easier to re-roll one bad segment.

| Clip | Duration | Prompt core |
|---|---|---|
| **A — Shutter** | 3 s | `Closed steel kirana shutter fills frame, rolls smoothly upward revealing warm golden light spilling from beneath. Locked camera, no movement.` |
| **B — Reveal** | 2 s | `Interior of a warmly lit Indian kirana store, densely stacked shelves of grocery packets, jars of pulses, sacks of atta, wooden counter with a weighing scale. Slow push-in. No people.` |
| **C — Zoom** | 3 s | `Slow forward dolly through a kirana shop aisle toward the counter, shelves drifting past on both sides, warm tungsten glow, dust motes in light beams. Ends centred and still.` |

Join them:

```bash
printf "file 'a.mp4'\nfile 'b.mp4'\nfile 'c.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy hero-raw.mp4
```

---

## 3. Encoding for scroll-scrubbing (do not skip)

Scroll-scrubbing sets `video.currentTime` every frame. A normal mp4 has keyframes
every ~2 seconds, so the browser decodes a long chain to reach an arbitrary frame —
that is exactly why scrubbed video stutters.

**Fix: one keyframe per frame** (`-g 1`).

```bash
# Scrub-optimised: every frame is a keyframe, faststart for instant playback
ffmpeg -i hero-raw.mp4 \
  -an \                                  # drop audio, it's a muted hero
  -vf "scale=1280:-2,fps=30" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -g 1 -keyint_min 1 -sc_threshold 0 \
  -crf 24 -preset slow \
  -movflags +faststart \
  public/hero-shutter.mp4
```

Expect roughly 3–6× the file size of a normal encode. Keep the source **under 8
seconds at 1280px** or you will ship a 20 MB hero.

**Also produce a WebM** (smaller, better on Android):

```bash
ffmpeg -i hero-raw.mp4 -an -vf "scale=1280:-2,fps=30" \
  -c:v libvpx-vp9 -g 1 -keyint_min 1 -crf 34 -b:v 0 -row-mt 1 \
  public/hero-shutter.webm
```

**Poster frame** (shown before the video decodes):

```bash
ffmpeg -i hero-raw.mp4 -vframes 1 -q:v 2 public/hero-poster.jpg
```

Sanity-check the size — anything over ~6 MB, raise `-crf` or cut the duration:

```bash
ls -lh public/hero-shutter.*
```

---

## 4. Wiring it in

`ShutterHero.tsx` already does the scroll work. To switch from CSS to video:

```tsx
<ShutterHero
  videoSrc="/hero-shutter.mp4"
  webmSrc="/hero-shutter.webm"
  poster="/hero-poster.jpg"
/>
```

With no `videoSrc` it renders the CSS shutter. Both share the same scroll timeline,
so the rest of the page is unaffected.

**Mobile Safari requirements** (all already set in the component):
`muted`, `playsInline`, `preload="auto"` — without `playsInline` iOS hijacks the
video into fullscreen and your hero is destroyed.

---

## 5. Timeline mapping

The hero pins for `200vh`. Scroll progress `p` runs 0 → 1:

| `p` | Beat | CSS mode | Video mode |
|---|---|---|---|
| 0.00–0.55 | Shutter rolls up | `scaleY` on shutter, slats lift | `currentTime` 0 → 55% |
| 0.35–0.70 | Store interior fades in | interior opacity 0 → 1 | (in video) |
| 0.55–0.90 | Camera pushes in | `scale` 1 → 1.35 | `currentTime` 55 → 100% |
| 0.85–1.00 | Dissolve to dashboard | hero opacity 1 → 0 | same |

Tune in `ShutterHero.tsx` — the breakpoints are named constants at the top.

---

## 6. Accessibility

`prefers-reduced-motion: reduce` is honoured: the hero collapses to a single static
frame with no pinning and no scrubbing. Judges do check this, and it costs nothing.

---

## 7. If you have 10 minutes, not 60

Ship the CSS shutter. It is already built, it is 0 KB, it never fails on venue wifi,
and it scrubs at 60fps on a phone. Spend the hour on your demo script instead —
Demo & Presentation is 5 points and Core Functionality is 25.
