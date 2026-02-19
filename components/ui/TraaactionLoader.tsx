'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'

interface TraaactionLoaderProps {
  size?: number
  className?: string
}

export function TraaactionLoader({ size = 48, className = '' }: TraaactionLoaderProps) {
  const TOTAL = 2.8
  const PAUSE = 0.6

  // Potrace-traced T shape (exact from logo PNG — includes the gap/notch)
  const tPath = "M 2.8 16.1 C 4.1 17.2 5.5 18.4 5.9 18.7 C 6.1 18.9 6.7 19.3 7.1 19.6 C 7.4 20 8.5 20.9 9.5 21.7 C 11.6 23.5 11.6 23.4 12.5 24.2 C 12.9 24.6 14.3 25.7 15.6 26.8 C 16.9 27.9 18.3 29 18.7 29.4 C 19.1 29.7 19.6 30.1 19.8 30.3 C 20 30.4 20.3 30.7 20.4 30.8 L 20.8 31.1 L 29.8 31.1 L 38.9 31.1 L 38.9 31.2 C 38.9 31.4 38.8 31.7 38.2 33.1 C 38.1 33.3 37.9 33.8 37.8 34.2 C 37.1 36.1 36.9 36.6 36.8 36.8 C 36.8 36.9 36.6 37.4 36.4 37.9 C 36.2 38.4 35.8 39.2 35.7 39.7 C 35.5 40.2 35.2 41 35 41.5 C 34.8 42 34.5 42.7 34.4 42.9 C 34.3 43.2 34.1 43.7 34 44.1 C 33.6 44.9 32.8 46.9 32.6 47.5 C 32.5 47.8 32.2 48.6 31.9 49.4 C 31.5 50.2 31.1 51.4 30.8 52 C 30.6 52.6 30.2 53.7 29.9 54.3 C 29.3 56 28.5 57.9 28.4 58.2 C 28.4 58.3 28.2 58.7 28 59.1 C 27.9 59.5 27.5 60.5 27.2 61.3 C 26.8 62 26.5 62.9 26.4 63.2 C 26.3 63.4 26.2 63.7 26.1 63.9 C 25.9 64.3 25.3 65.9 25.4 65.9 C 25.4 65.9 26.3 65.3 27.3 64.6 C 27.5 64.4 28.5 63.7 29.6 63 C 30.6 62.2 31.8 61.4 32.2 61.1 C 33.1 60.4 37.1 57.6 37.4 57.4 C 37.5 57.3 38.4 56.7 39.4 56 C 40.4 55.2 41.6 54.4 42 54.1 C 42.5 53.8 43.2 53.3 43.6 53 C 44.4 52.4 46.5 50.9 47.7 50.1 C 48.1 49.8 49.1 49.1 50 48.4 C 55.2 44.7 55.7 44.4 56.7 43.7 C 57.1 43.4 57.7 42.9 58.2 42.6 C 59.4 41.7 60 41.2 60.5 40.7 C 60.9 40.1 61.5 39.1 62.3 37.1 C 62.5 36.7 62.7 36.2 62.8 36.1 C 62.8 35.9 63.1 35.1 63.5 34.4 C 63.8 33.7 64.1 32.9 64.2 32.7 C 64.4 32.3 65.2 31.6 65.7 31.4 L 66.1 31.3 L 72.9 31.2 L 79.7 31.1 L 80.4 31 C 81.2 30.9 82.9 30.4 83.4 30.3 C 83.5 30.2 83.8 30.1 83.9 30.1 C 84.3 29.9 86.1 29 86.8 28.5 C 88 27.8 88.7 27.2 89.9 26.1 C 91.7 24.3 92.6 23.1 94 20.9 C 94.3 20.3 94.8 19.5 95 19.2 C 95.4 18.5 95.6 18.1 96.2 17 C 96.4 16.5 96.7 16.1 96.7 16 C 96.8 16 96.8 15.9 96.8 15.8 L 96.8 15.7 L 49.6 15.7 L 2.4 15.7 L 2.8 16.1 Z"

  // Potrace-traced Arrow shape (exact from logo PNG)
  const arrowPath = "M 85.6 33 C 85.3 33.1 84.3 33.2 83.5 33.3 C 82.6 33.4 81.8 33.5 81.7 33.6 C 81.5 33.6 80.7 33.7 79.8 33.8 C 78.8 33.9 77.2 34.1 76.2 34.2 C 75.2 34.4 73.6 34.6 72.8 34.7 C 71.9 34.8 71.2 34.9 71.1 34.9 C 71.1 35 70.2 35.1 69.1 35.2 C 67.1 35.3 66.3 35.4 66.3 35.6 C 66.3 35.6 66.5 35.9 66.8 36.3 C 67.1 36.6 67.4 36.9 67.5 37.1 C 67.6 37.2 68.1 37.8 68.6 38.4 C 69.1 39 69.6 39.6 69.6 39.6 C 69.6 39.6 69.3 39.9 68.9 40.1 C 68.2 40.6 64.8 43.1 63.6 43.9 C 63.1 44.2 62.5 44.7 62.1 44.9 C 60.7 45.9 58.3 47.7 57.3 48.4 C 56.8 48.7 56 49.3 55.6 49.6 C 55.2 49.8 54.3 50.5 53.5 51.1 C 51.4 52.5 50.2 53.4 50 53.5 C 49.8 53.6 49.5 53.9 49.1 54.2 C 48.7 54.4 47.9 55 47.2 55.5 C 45.1 57 43.7 58 43 58.5 C 42.2 59 39.8 60.7 39.3 61.1 C 39 61.2 38.5 61.6 38 62 C 37.2 62.5 36.5 63 35.2 64 C 33.5 65.2 32.5 65.9 31.8 66.4 C 31.4 66.6 30.7 67.1 30.3 67.5 C 29.8 67.8 29.1 68.3 28.7 68.6 C 28.3 68.8 27.7 69.2 27.4 69.5 C 27 69.7 26.3 70.2 25.7 70.6 C 25.2 71 24.1 71.8 23.4 72.3 C 22.6 72.8 21.5 73.6 21 74 C 19.7 74.9 18.9 75.5 18 76.1 C 17.6 76.4 17.2 76.7 17.1 76.7 C 16.9 76.9 15.9 77.6 14.5 78.6 C 13.9 79 13.3 79.4 13.2 79.5 C 12.4 80.1 8.9 82.6 8.7 82.7 L 8.6 82.8 L 9.3 82.6 C 9.7 82.5 10.2 82.3 10.4 82.2 C 10.5 82.2 10.7 82.1 10.8 82.1 C 10.9 82.1 12.3 81.6 13.6 81 C 14.2 80.7 15.3 80.2 16.1 79.9 C 16.8 79.6 17.7 79.2 18 79 C 18.3 78.9 18.5 78.8 18.6 78.8 C 18.6 78.8 19.2 78.5 20.1 78.2 C 20.2 78.1 20.7 77.9 21.1 77.7 C 21.8 77.4 22.4 77.1 23.1 76.8 C 25.3 75.8 27 75.1 27 75.2 C 27.1 75.2 27.1 75.3 27 75.3 C 27 75.4 26.7 76.1 26.3 76.9 C 26 77.6 25.7 78.3 25.6 78.5 C 25.6 78.6 25.2 79.3 24.9 80.1 C 23.4 83.5 22.6 85.3 22.4 85.7 C 22.3 85.9 22.2 86.1 22.2 86.1 C 22.2 86.2 22.1 86.4 22 86.7 C 21.8 87 21.7 87.3 21.7 87.4 C 21.7 87.4 21.6 87.6 21.5 87.8 C 21.4 88 21.3 88.3 21.3 88.4 C 21.2 88.5 21.1 88.8 21.1 89 C 20.7 89.7 20.4 90.5 20.5 90.6 C 20.5 90.7 24 88.9 32.9 84.4 C 37.7 82 38.8 81.4 40.5 80.2 C 41.7 79.3 42.6 78.5 43.3 77.6 C 44.4 76.2 45.2 74.8 46.1 72.8 C 46.3 72.4 46.5 71.9 46.6 71.8 C 46.6 71.6 47 70.8 47.3 70.1 C 47.6 69.3 48.3 67.7 48.9 66.5 C 49.4 65.2 49.9 64.1 50 63.8 C 50.1 63.6 50.4 62.9 50.6 62.4 L 51.1 61.4 L 52.8 60.1 C 53.8 59.4 55.2 58.4 56 57.9 C 57.3 57 58.2 56.3 60.9 54.4 C 61.7 53.8 62.9 53 63.6 52.5 C 64.2 52.1 65.6 51.1 66.6 50.4 C 67.6 49.7 69.1 48.7 69.8 48.2 C 70.5 47.7 71.6 46.9 72.2 46.5 C 72.8 46.1 73.3 45.7 73.4 45.7 C 73.4 45.7 73.6 45.9 73.7 46.1 C 73.8 46.4 74 46.8 74.2 47 C 74.6 47.8 74.9 48.2 75.6 49.5 C 76 50.2 76.5 51 76.7 51.3 C 76.8 51.6 77 51.8 77 51.8 C 77.1 51.8 77.3 51.6 77.8 50.6 C 78.1 50 78.5 49.3 78.6 49.1 C 78.8 48.8 79.2 47.9 79.6 47.2 C 80 46.4 80.6 45.3 80.9 44.8 C 81.1 44.2 82.1 42.4 82.9 40.8 C 84.8 37 85.2 36.3 86.2 34.4 L 87.1 32.9 L 86.6 32.9 C 86.3 32.9 85.8 33 85.6 33 Z"

  // Gap filler: covers the notch/gap in tPath so the T looks solid pre-impact
  const gapFiller = "M 39 31 L 61 41 L 50 48 L 39 56 L 27 65 L 25 66 L 30 54 L 35 42 Z"

  const clipId = useId().replace(/:/g, '')

  // Gap diagonal line: from (0,83) to (100,14) — matches the gap angle in the logo
  // Top clip: bar + upper stem (above gap)
  // Bottom clip: lower stem (below gap)
  // Extra points ensure the bar is fully in the top clip

  // ═══════════════════════════════════════════
  // ANIMATION CONCEPT:
  // 1. Solid T visible (tPath + gapFiller)
  // 2. Arrow flies in from bottom-left
  // 3. IMPACT: gapFiller vanishes, T halves kick apart
  // 4. Halves settle back → arrow stays → = final logo
  // 5. Hold, then fade & loop
  // ═══════════════════════════════════════════

  // Timeline fractions (of TOTAL = 2.8s):
  // 0.00 – 0.30 : arrow flying in          (0–0.84s)
  // 0.30        : IMPACT                   (0.84s)
  // 0.30 – 0.40 : halves kick out          (0.84–1.12s)
  // 0.40 – 0.54 : halves settle            (1.12–1.51s)
  // 0.54 – 0.86 : hold logo                (1.51–2.41s)
  // 0.86 – 1.00 : fade out & reset         (2.41–2.80s)

  // SOLID T (pre-impact): visible, then vanishes at impact
  const solidTAnim = {
    opacity: [1, 1, 0, 0, 0, 1],
    transition: {
      duration: TOTAL,
      times: [0, 0.28, 0.30, 0.86, 0.94, 1],
      repeat: Infinity,
      repeatDelay: PAUSE,
    },
  }

  // TOP HALF (post-impact): appears at impact, kicks up-right, settles
  const topAnim = {
    opacity: [0, 0, 1, 1, 1, 0],
    x: [0, 0, 6, 0, 0, 0],
    y: [0, 0, -5, 0, 0, 0],
    rotate: [0, 0, -3, 0, 0, 0],
    transition: {
      duration: TOTAL,
      times: [0, 0.29, 0.34, 0.50, 0.86, 1],
      repeat: Infinity,
      repeatDelay: PAUSE,
    },
  }

  // BOTTOM HALF (post-impact): appears briefly at impact, flies away down-left and DISAPPEARS
  // This ensures the arrow stands alone, not glued to the bottom stem
  const bottomAnim = {
    opacity: [0, 0, 0.8, 0, 0, 0],
    x: [0, 0, -12, -20, -20, 0],
    y: [0, 0, 14, 22, 22, 0],
    rotate: [0, 0, 5, 8, 8, 0],
    transition: {
      duration: TOTAL,
      times: [0, 0.29, 0.34, 0.44, 0.86, 1],
      repeat: Infinity,
      repeatDelay: PAUSE,
    },
  }

  // ARROW: flies in from bottom-left, stops at impact position, holds, fades
  const arrowAnim = {
    opacity: [0, 1, 1, 1, 0],
    x: [-50, 0, 0, 0, -50],
    y: [50, 0, 0, 0, 50],
    transition: {
      duration: TOTAL,
      times: [0, 0.30, 0.54, 0.86, 1],
      repeat: Infinity,
      repeatDelay: PAUSE,
    },
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
    >
      <defs>
        {/* Top clip: everything above the gap diagonal + full bar area */}
        <clipPath id={`${clipId}-top`}>
          <polygon points="0,0 100,0 100,14 62,40 25,66 0,83" />
        </clipPath>
        {/* Bottom clip: everything below the gap diagonal */}
        <clipPath id={`${clipId}-bot`}>
          <polygon points="62,40 100,14 100,100 0,100 0,83 25,66" />
        </clipPath>
      </defs>

      {/* LAYER 1: Solid T (pre-impact) — tPath + gapFiller makes it look whole */}
      <motion.g animate={solidTAnim}>
        <path d={tPath} />
        <path d={gapFiller} />
      </motion.g>

      {/* LAYER 2: Top half of T (post-impact) — clipped above gap */}
      <motion.g
        animate={topAnim}
        style={{ transformOrigin: '50px 30px' }}
        clipPath={`url(#${clipId}-top)`}
      >
        <path d={tPath} />
      </motion.g>

      {/* LAYER 3: Bottom half of T (post-impact) — clipped below gap */}
      <motion.g
        animate={bottomAnim}
        style={{ transformOrigin: '35px 70px' }}
        clipPath={`url(#${clipId}-bot)`}
      >
        <path d={tPath} />
      </motion.g>

      {/* LAYER 4: Arrow — flies in and stays */}
      <motion.g
        animate={arrowAnim}
        initial={{ x: -50, y: 50, opacity: 0 }}
        style={{ transformOrigin: '50px 55px' }}
      >
        <path d={arrowPath} />
      </motion.g>
    </svg>
  )
}
