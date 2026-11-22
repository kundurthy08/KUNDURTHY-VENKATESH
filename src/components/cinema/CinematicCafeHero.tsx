import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import nizamTourVideo from '../../assets/videos/charminar_nizam_tour.webm';
import nizamHallImg from '../../assets/images/nizam_palace_hall_1795363759621.jpg';
import nizamSamovarImg from '../../assets/images/nizam_samovar_counter_1795363760681.jpg';
import nizamAlcoveImg from '../../assets/images/nizam_divan_alcove_1795363759678.jpg';
import nizamCourtyardImg from '../../assets/images/cafe_3d_courtyard_arch_1795361406785.jpg';

interface NizamSceneSpec {
  id: string;
  chapter: string;
  caption: string;
  image: string;
  motionClass: string;
  startSec: number;
}

const NIZAM_SCENES: NizamSceneSpec[] = [
  {
    id: 'nizam-hall',
    chapter: '01 · Grand Nizam Hall',
    caption: 'Cusped heritage green & gold-leaf mehrab arches illuminated by crystal chandeliers',
    image: nizamHallImg,
    motionClass: 'cinema-motion-0',
    startSec: 0,
  },
  {
    id: 'nizam-samovar',
    chapter: '02 · Royal Samovar Bar',
    caption: 'Hand-hammered antique brass samovar, gold-rimmed porcelain & pastry vitrine',
    image: nizamSamovarImg,
    motionClass: 'cinema-motion-1',
    startSec: 6,
  },
  {
    id: 'nizam-alcove',
    chapter: '03 · Velvet Divan Alcove',
    caption: 'Emerald velvet seating framed by carved teakwood jaali & gilded archways',
    image: nizamAlcoveImg,
    motionClass: 'cinema-motion-2',
    startSec: 12,
  },
  {
    id: 'nizam-courtyard',
    chapter: '04 · Courtyard Verandah',
    caption: 'Afternoon Deccani sunlight filtering across carved stone & verandah colonnades',
    image: nizamCourtyardImg,
    motionClass: 'cinema-motion-3',
    startSec: 18,
  },
];

const SCENE_DURATION_SEC = 6;

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
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [introDissolving, setIntroDissolving] = useState(false);
  const [introRunKey, setIntroRunKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const replayIntro = () => {
    setActiveChapter(0);
    setPlaying(true);
    setIntroDissolving(false);
    setIntroActive(true);
    setIntroRunKey((k) => k + 1);
    const v = videoRef.current;
    if (v && !videoFailed) {
      try {
        v.currentTime = 0;
        void v.play();
      } catch {
        // Fallback image tour remains active
      }
    }
  };

  const skipIntro = () => {
    setIntroActive(false);
    setIntroDissolving(false);
  };

  // Optional Royal Charminar outline entrance curtain when requested
  useEffect(() => {
    if (!introActive) return;
    const t1 = window.setTimeout(() => setIntroDissolving(true), 2100);
    const t2 = window.setTimeout(() => {
      setIntroActive(false);
      setIntroDissolving(false);
    }, 2800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [introActive, introRunKey]);

  // Verify WebM support & trigger reliable autoplay when mounted
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const canPlay =
      typeof v.canPlayType === 'function' &&
      (v.canPlayType('video/webm; codecs="vp8"') !== '' || v.canPlayType('video/webm') !== '');
    if (!canPlay) {
      setVideoFailed(true);
      return;
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPlaying(false);
      v.pause();
      return;
    }

    v.muted = true;
    v.defaultMuted = true;
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay blocked — fallback animated Nizam stills remain 100% visible
      });
    }
  }, []);

  // Fallback chapter timer whenever video isn't driving playback
  useEffect(() => {
    if (!playing || (videoReady && !videoFailed)) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const timer = window.setInterval(() => {
      setActiveChapter((prev) => (prev + 1) % NIZAM_SCENES.length);
    }, SCENE_DURATION_SEC * 1000);
    return () => window.clearInterval(timer);
  }, [playing, videoReady, videoFailed]);

  const handleTogglePlay = () => {
    const next = !playing;
    setPlaying(next);
    const v = videoRef.current;
    if (v && !videoFailed) {
      if (next) {
        void v.play().catch(() => {
          // Safe ignore
        });
      } else {
        v.pause();
      }
    }
  };

  const handleSelectChapter = (idx: number) => {
    setActiveChapter(idx);
    const v = videoRef.current;
    const scene = NIZAM_SCENES[idx];
    if (v && !videoFailed && scene) {
      try {
        v.currentTime = scene.startSec;
      } catch {
        // Safe ignore if metadata is still loading
      }
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !videoReady || videoFailed) return;
    const idx = Math.floor(v.currentTime / SCENE_DURATION_SEC) % NIZAM_SCENES.length;
    if (idx !== activeChapter && idx >= 0 && idx < NIZAM_SCENES.length) {
      setActiveChapter(idx);
    }
  };

  const currentScene = NIZAM_SCENES[activeChapter] || NIZAM_SCENES[0];
  const showVideoLayer = videoReady && !videoFailed;

  return (
    <div className="space-y-6">
      {/* 1. UNOBSTRUCTED FULL-BLEED ROYAL NIZAM ARCHITECTURAL VIDEO STAGE */}
      <div className="relative w-full h-[320px] sm:h-[460px] lg:h-[600px] overflow-hidden bg-[#173E32] rounded-2xl border border-[#D5AE70]/40 shadow-sm">
        {/* Layer 0: Immediate High-Res Architectural Backdrop (guarantees zero green/blank frames) */}
        {NIZAM_SCENES.map((scene, idx) => {
          const isActive = idx === activeChapter;
          return (
            <div
              key={scene.id}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
              aria-hidden={!isActive}
            >
              <img
                src={scene.image}
                alt={scene.caption}
                loading="eager"
                decoding="sync"
                className={`w-full h-full object-cover ${scene.motionClass} ${
                  playing ? '' : 'cinema-paused'
                }`}
              />
            </div>
          );
        })}

        {/* Layer 1: Native HTML5 Royal Nizam Architectural Film (<video>) */}
        {!videoFailed && (
          <video
            ref={videoRef}
            src={nizamTourVideo}
            poster={NIZAM_SCENES[0].image}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setVideoFailed(true)}
            aria-label="Charminar Café Royal Nizam interior architectural film"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{
              opacity: showVideoLayer ? 1 : 0,
              zIndex: 2,
            }}
          />
        )}

        {/* Delicate Bottom-Edge Scrim Only for Cinema Control Legibility */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 z-[3] bg-gradient-to-t from-[#091611]/90 via-[#091611]/40 to-transparent"
          aria-hidden="true"
        />

        {/* Optional Royal Charminar Golden Outline Entrance (Triggered by Royal Entrance) */}
        {introActive && (
          <div
            key={introRunKey}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0A1813] px-6 transition-opacity duration-700 ${
              introDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <svg
              viewBox="0 0 320 210"
              className="w-56 sm:w-72 h-auto text-[#D5AE70]"
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
              onClick={skipIntro}
              className="mt-6 px-4 py-1.5 rounded-lg border border-[#D5AE70]/45 text-xs font-medium text-[#F0E5D0]/90 hover:bg-[#173E32] hover:text-[#D5AE70] transition-colors cursor-pointer"
            >
              Skip Entrance
            </button>
          </div>
        )}

        {/* Minimal Bottom-Edge Cinema Controls */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="hidden md:block text-xs text-[#F0E5D0]/95">
            <span className="font-semibold text-[#D5AE70]">{currentScene.chapter}</span>
            <span className="mx-2 text-[#D5AE70]/50">·</span>
            <span>{currentScene.caption}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {NIZAM_SCENES.map((scene, idx) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSelectChapter(idx)}
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
              onClick={handleTogglePlay}
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
              <span>Royal Entrance</span>
            </button>
          </div>
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
