import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

interface NizamSceneSpec {
  id: string;
  chapter: string;
  caption: string;
  image: string;
  zoomFrom: number;
  zoomTo: number;
  panXFrom: number;
  panXTo: number;
  panYFrom: number;
  panYTo: number;
}

const NIZAM_SCENES: NizamSceneSpec[] = [
  {
    id: 'nizam-hall',
    chapter: '01 · Grand Nizam Hall',
    caption: 'Cusped heritage green & gold-leaf mehrab arches illuminated by crystal chandeliers',
    image: '/src/assets/images/nizam_palace_hall_1795363759621.jpg',
    zoomFrom: 1.0,
    zoomTo: 1.12,
    panXFrom: -0.015,
    panXTo: 0.015,
    panYFrom: 0.01,
    panYTo: -0.01,
  },
  {
    id: 'nizam-samovar',
    chapter: '02 · Royal Samovar Bar',
    caption: 'Hand-hammered antique brass samovar, gold-rimmed porcelain & pastry vitrine',
    image: '/src/assets/images/nizam_samovar_counter_1795363760681.jpg',
    zoomFrom: 1.08,
    zoomTo: 1.0,
    panXFrom: 0.02,
    panXTo: -0.02,
    panYFrom: 0.0,
    panYTo: -0.012,
  },
  {
    id: 'nizam-alcove',
    chapter: '03 · Velvet Divan Alcove',
    caption: 'Emerald velvet seating framed by carved teakwood jaali & gilded archways',
    image: '/src/assets/images/nizam_divan_alcove_1795363759678.jpg',
    zoomFrom: 1.0,
    zoomTo: 1.13,
    panXFrom: 0.012,
    panXTo: -0.018,
    panYFrom: -0.01,
    panYTo: 0.012,
  },
  {
    id: 'nizam-courtyard',
    chapter: '04 · Courtyard Verandah',
    caption: 'Afternoon Deccani sunlight filtering across carved stone & verandah colonnades',
    image: '/src/assets/images/cafe_3d_courtyard_arch_1795361406785.jpg',
    zoomFrom: 1.1,
    zoomTo: 1.01,
    panXFrom: -0.022,
    panXTo: 0.02,
    panYFrom: 0.008,
    panYTo: -0.008,
  },
];

const SCENE_DURATION_SEC = 6.5;
const CROSSFADE_SEC = 1.6;

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

interface CinematicCafeHeroProps {
  onNavigate: (route: 'menu' | 'reservations' | 'story') => void;
  onOrderNow?: () => void;
}

export const CinematicCafeHero: React.FC<CinematicCafeHeroProps> = ({
  onNavigate,
  onOrderNow,
}) => {
  const [activeChapter, setActiveChapter] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progressRatio, setProgressRatio] = useState(0);
  const [introPhase, setIntroPhase] = useState<'curtain' | 'dissolve' | 'complete'>(() => {
    if (typeof window === 'undefined') return 'complete';
    const reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return 'complete';
    try {
      return sessionStorage.getItem('charminar_intro_seen') ? 'complete' : 'curtain';
    } catch {
      return 'curtain';
    }
  });
  const [introRunKey, setIntroRunKey] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playingRef = useRef(true);
  const timelineSecRef = useRef(0);
  const activeChapterRef = useRef(0);

  playingRef.current = playing;

  const finishIntro = () => {
    setIntroPhase('complete');
    try {
      sessionStorage.setItem('charminar_intro_seen', '1');
    } catch {
      // ignore storage failure
    }
  };

  const replayIntro = () => {
    timelineSecRef.current = 0;
    activeChapterRef.current = 0;
    setActiveChapter(0);
    setProgressRatio(0);
    setPlaying(true);
    setIntroPhase('curtain');
    setIntroRunKey((k) => k + 1);
  };

  const jumpToChapter = (index: number) => {
    timelineSecRef.current = index * SCENE_DURATION_SEC;
    activeChapterRef.current = index;
    setActiveChapter(index);
    setProgressRatio(index / NIZAM_SCENES.length);
  };

  // Opening sequence: Dark -> Golden Charminar Outline -> Logo -> Dissolve into Film
  useEffect(() => {
    if (introPhase !== 'curtain') return;
    const t1 = window.setTimeout(() => setIntroPhase('dissolve'), 2300);
    return () => window.clearTimeout(t1);
  }, [introPhase, introRunKey]);

  useEffect(() => {
    if (introPhase !== 'dissolve') return;
    const t2 = window.setTimeout(() => finishIntro(), 900);
    return () => window.clearTimeout(t2);
  }, [introPhase]);

  // 60fps HTML5 Canvas Architectural Video Compositor (Silk Crossfades + Ken Burns Camera + Gold Motes)
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const images: HTMLImageElement[] = NIZAM_SCENES.map((scene) => {
      const img = new Image();
      img.src = scene.image;
      return img;
    });

    const motes = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.0 + Math.random() * 1.8,
      vy: 0.012 + Math.random() * 0.02,
      vx: (Math.random() - 0.5) * 0.006,
      alpha: 0.14 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      if (!stage || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = stage.clientWidth || 1280;
      const h = stage.clientHeight || 620;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawCoverImage = (
      img: HTMLImageElement,
      spec: NizamSceneSpec,
      localProgress: number,
      alpha: number
    ) => {
      if (!img.complete || img.naturalWidth === 0 || alpha <= 0.001) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const ease = easeInOutSine(Math.min(Math.max(localProgress, 0), 1));

      const zoom = spec.zoomFrom + (spec.zoomTo - spec.zoomFrom) * ease;
      const panX = spec.panXFrom + (spec.panXTo - spec.panXFrom) * ease;
      const panY = spec.panYFrom + (spec.panYTo - spec.panYFrom) * ease;

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = cw / ch;

      let drawW = cw;
      let drawH = ch;
      if (canvasAspect > imgAspect) {
        drawW = cw;
        drawH = cw / imgAspect;
      } else {
        drawH = ch;
        drawW = ch * imgAspect;
      }

      drawW *= zoom;
      drawH *= zoom;

      const dx = (cw - drawW) / 2 + panX * cw;
      const dy = (ch - drawH) / 2 + panY * ch;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    };

    const totalCycle = NIZAM_SCENES.length * SCENE_DURATION_SEC;
    let rafId = 0;
    let lastNow = performance.now();
    let uiSyncCounter = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      if (playingRef.current && !reducedMotion) {
        timelineSecRef.current = (timelineSecRef.current + dt) % totalCycle;
      }

      const t = timelineSecRef.current;
      const currIdx = Math.floor(t / SCENE_DURATION_SEC) % NIZAM_SCENES.length;
      const nextIdx = (currIdx + 1) % NIZAM_SCENES.length;
      const sceneElapsed = t % SCENE_DURATION_SEC;
      const currProgress = sceneElapsed / SCENE_DURATION_SEC;

      const fadeStart = SCENE_DURATION_SEC - CROSSFADE_SEC;
      let nextAlpha = 0;
      if (sceneElapsed > fadeStart) {
        nextAlpha = easeInOutSine((sceneElapsed - fadeStart) / CROSSFADE_SEC);
      }

      ctx.fillStyle = '#0A1813';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawCoverImage(images[currIdx], NIZAM_SCENES[currIdx], currProgress, 1.0);
      if (nextAlpha > 0.002) {
        const nextLocalProgress = (sceneElapsed - fadeStart) / SCENE_DURATION_SEC;
        drawCoverImage(images[nextIdx], NIZAM_SCENES[nextIdx], nextLocalProgress, nextAlpha);
      }

      // Subtle warm golden motes drifting in chandelier light
      if (!reducedMotion) {
        const cw = canvas.width;
        const ch = canvas.height;
        for (let i = 0; i < motes.length; i++) {
          const m = motes[i];
          if (playingRef.current) {
            m.y -= m.vy * dt;
            m.x += (m.vx + Math.sin(now * 0.0007 + m.phase) * 0.003) * dt;
            if (m.y < -0.04) {
              m.y = 1.04;
              m.x = Math.random();
            }
          }
          const px = m.x * cw;
          const py = m.y * ch;
          const rad = m.r * 3.5;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
          grad.addColorStop(0, `rgba(246, 214, 148, ${m.alpha})`);
          grad.addColorStop(1, 'rgba(246, 214, 148, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (activeChapterRef.current !== currIdx) {
        activeChapterRef.current = currIdx;
        setActiveChapter(currIdx);
      }
      uiSyncCounter = (uiSyncCounter + 1) % 4;
      if (uiSyncCounter === 0) {
        setProgressRatio(t / totalCycle);
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const currentScene = NIZAM_SCENES[activeChapter] || NIZAM_SCENES[0];

  return (
    <div className="space-y-6">
      {/* 1. UNOBSTRUCTED FULL-BLEED ROYAL NIZAM ARCHITECTURAL CINEMA STAGE */}
      <div
        ref={stageRef}
        className="relative w-full aspect-[16/9] max-h-[640px] min-h-[340px] overflow-hidden bg-[#0A1813] rounded-2xl border border-[#D5AE70]/35 shadow-sm"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          aria-label="Royal Nizam Style Charminar Café Architectural Cinema"
        />

        {/* Delicate bottom edge vignette solely for bottom cinema bar contrast */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#091611]/90 via-[#091611]/40 to-transparent"
          aria-hidden="true"
        />

        {/* Cinematic Opening Curtain: Dark -> Golden Charminar Outline -> Emerging Logo */}
        {introPhase !== 'complete' && (
          <div
            key={introRunKey}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0A1813] px-6 transition-opacity duration-900 ${
              introPhase === 'dissolve' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-live="polite"
          >
            <svg
              viewBox="0 0 320 210"
              className="w-60 sm:w-76 h-auto text-[#D5AE70]"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="animate-charminar-draw"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M32 195 L32 62 L44 38 L56 62 L56 195
                   M264 195 L264 62 L276 38 L288 62 L288 195
                   M44 38 L44 20 M276 38 L276 20
                   M56 195 L56 88 L264 88 L264 195
                   M92 195 L92 142 Q112 96 160 88 Q208 96 228 142 L228 195
                   M108 195 L108 148 Q128 112 160 106 Q192 112 212 148 L212 195
                   M84 88 L84 64 L236 64 L236 88
                   M124 64 Q160 22 196 64 M160 36 L160 16"
              />
            </svg>

            <div className="animate-charminar-logo text-center mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D5AE70]">
                Royal Nizam Heritage · Hyderabad Café
              </p>
              <h2 className="mt-2 font-display text-4xl sm:text-5xl font-semibold tracking-wide text-[#F0E5D0]">
                CHARMINAR CAFÉ
              </h2>
            </div>

            <button
              type="button"
              onClick={finishIntro}
              className="mt-6 px-4 py-1.5 rounded-lg border border-[#D5AE70]/45 text-xs font-medium text-[#F0E5D0]/90 hover:bg-[#173E32] hover:text-[#D5AE70] transition-colors cursor-pointer"
            >
              Skip Entrance
            </button>
          </div>
        )}

        {/* Minimal Bottom-Edge Cinema Controls (Never obstructs the center/top Nizam arches) */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="hidden sm:block text-xs text-[#F0E5D0]/90">
            <span className="font-semibold text-[#D5AE70]">{currentScene.chapter}</span>
            <span className="mx-2 text-[#D5AE70]/50">·</span>
            <span>{currentScene.caption}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {NIZAM_SCENES.map((scene, idx) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => jumpToChapter(idx)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  idx === activeChapter
                    ? 'bg-[#D5AE70] text-[#173E32] font-semibold'
                    : 'bg-[#091611]/75 text-[#F0E5D0]/85 hover:bg-[#173E32]'
                }`}
              >
                0{idx + 1}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#091611]/80 text-[11px] font-medium text-[#F0E5D0] hover:bg-[#173E32] transition-colors cursor-pointer"
              aria-label={playing ? 'Pause film' : 'Play film'}
            >
              {playing ? (
                <Pause className="w-3 h-3 text-[#D5AE70]" />
              ) : (
                <Play className="w-3 h-3 text-[#D5AE70]" />
              )}
              <span>{playing ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={replayIntro}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#091611]/80 border border-[#D5AE70]/35 text-[11px] font-medium text-[#F0E5D0] hover:bg-[#173E32] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-[#D5AE70]" />
              <span>Replay</span>
            </button>
          </div>
        </div>

        {/* Continuous Subtle Gold Cinema Progress Scrubber */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D5AE70]/20 z-10">
          <div
            className="h-full bg-[#D5AE70] transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.min(Math.max(progressRatio * 100, 1), 100)}%` }}
          />
        </div>
      </div>

      {/* 2. DEDICATED ROYAL NIZAM EDITORIAL BAR BELOW THE CINEMA FRAME (ZERO IMAGE OBSTRUCTION) */}
      <div className="bg-[#173E32] text-[#F0E5D0] rounded-2xl border border-[#D5AE70]/35 px-7 py-7 sm:px-10 sm:py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#D5AE70]">
            Royal Nizam Heritage · Contemporary Indian Café
          </p>
          <h1 className="mt-1.5 font-display text-4xl sm:text-5xl font-semibold leading-[1.06] text-balance text-[#F0E5D0]">
            A Taste of Hyderabad.{' '}
            <span className="text-[#D5AE70]">A Feeling of Home.</span>
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-[#F0E5D0]/88 leading-relaxed">
            From the streets of Hyderabad to your favourite café moments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className="px-5 py-3 rounded-lg bg-[#D5AE70] text-[#173E32] text-sm font-semibold uppercase tracking-wide hover:bg-[#E2C28D] transition-colors whitespace-nowrap cursor-pointer"
          >
            Explore Our Menu
          </button>
          <button
            type="button"
            onClick={() => (onOrderNow ? onOrderNow() : onNavigate('menu'))}
            className="px-5 py-3 rounded-lg bg-[#8C3E25] text-[#F0E5D0] text-sm font-semibold uppercase tracking-wide hover:bg-[#A14A2E] transition-colors whitespace-nowrap cursor-pointer"
          >
            Order Now
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reservations')}
            className="px-4 py-3 rounded-lg border border-[#F0E5D0]/35 text-[#F0E5D0] text-sm font-medium hover:bg-[#F0E5D0]/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            Reserve a Table
          </button>
        </div>
      </div>
    </div>
  );
};
