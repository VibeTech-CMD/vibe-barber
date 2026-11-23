import { useEffect, useRef, useState } from 'react';

interface SnipSpark {
  id: number;
  x: number;
  y: number;
}

/**
 * Custom Animated Barber Scissors Cursor (Desktop / Fine Pointer only)
 * - Moves smoothly with open golden blades
 * - Tilts & glows when hovering clickable controls
 * - Snaps CLOSED with a golden cut spark on click (mousedown)
 */
export function ScissorCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isSnipping, setIsSnipping] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [sparks, setSparks] = useState<SnipSpark[]>([]);

  const cursorRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer) return;

    setEnabled(true);
    document.body.classList.add('scissor-cursor-active');

    const syncPosition = () => {
      const { x, y } = posRef.current;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${x - 160}px, ${y - 160}px, 0)`;
      }
      rafRef.current = null;
    };

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(syncPosition);
      }

      const target = e.target as HTMLElement | null;
      const interactive = Boolean(
        target?.closest('a, button, input, select, textarea, [role="button"], label')
      );
      setIsHovering(interactive);
    };

    const onDown = (e: MouseEvent) => {
      setIsSnipping(true);
      const id = Date.now() + Math.random();
      setSparks((prev) => [...prev.slice(-4), { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => {
        setSparks((prev) => prev.filter((s) => s.id !== id));
      }, 420);
    };

    const onUp = () => {
      window.setTimeout(() => setIsSnipping(false), 110);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      document.body.classList.remove('scissor-cursor-active');
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  if (!enabled) return null;

  // Blade opening angle: open when gliding, slightly wider on hover, SNAPPED closed (0deg) on click
  const bladeAngle = isSnipping ? 0 : isHovering ? 26 : 19;

  return (
    <>
      {/* Ambient Mouse Spotlight Glow */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30 w-80 h-80 rounded-full transition-opacity duration-300"
        style={{
          opacity: visible ? 0.55 : 0,
          background:
            'radial-gradient(circle, rgba(232,176,75,0.16) 0%, rgba(245,158,11,0.06) 38%, rgba(56,189,248,0.03) 62%, transparent 74%)',
        }}
      />

      {/* Click Snip Sparks */}
      {sparks.map((spark) => (
        <div
          key={spark.id}
          aria-hidden="true"
          className="pointer-events-none fixed z-[9998] snip-burst"
          style={{ left: spark.x, top: spark.y }}
        >
          <span className="snip-ring" />
          <span className="snip-line snip-line-1" />
          <span className="snip-line snip-line-2" />
        </div>
      ))}

      {/* Articulated Barber Scissors Cursor */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] will-change-transform transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div
          className="relative -translate-x-[6px] -translate-y-[6px] transition-transform duration-150"
          style={{
            transform: `translate(-6px, -6px) rotate(${isHovering ? -14 : -6}deg) scale(${isSnipping ? 0.92 : isHovering ? 1.12 : 1})`,
            filter: isHovering
              ? 'drop-shadow(0 0 12px rgba(245, 203, 118, 0.85))'
              : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.75))',
          }}
        >
          <svg
            width="42"
            height="42"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bladeGold" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF3C4" />
                <stop offset="45%" stopColor="#E8B04B" />
                <stop offset="100%" stopColor="#B87A1E" />
              </linearGradient>
              <linearGradient id="bladeSteel" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="55%" stopColor="#E5E7EB" />
                <stop offset="100%" stopColor="#9CA3AF" />
              </linearGradient>
            </defs>

            {/* Upper Blade + Ring (pivots around screw at 21,21) */}
            <g
              style={{
                transformOrigin: '21px 21px',
                transform: `rotate(-${bladeAngle}deg)`,
                transition: 'transform 95ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <path
                d="M6 6 L23 19.5 L20.5 22.5 L8.5 11.5 C6.5 9.6 5.5 7.6 6 6Z"
                fill="url(#bladeSteel)"
                stroke="#0B0D10"
                strokeWidth="0.9"
              />
              <path
                d="M21 21 L32 30"
                stroke="url(#bladeGold)"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle
                cx="36.5"
                cy="33.5"
                r="5.5"
                stroke="url(#bladeGold)"
                strokeWidth="3"
                fill="rgba(11,13,16,0.55)"
              />
            </g>

            {/* Lower Blade + Ring (pivots around screw at 21,21) */}
            <g
              style={{
                transformOrigin: '21px 21px',
                transform: `rotate(${bladeAngle}deg)`,
                transition: 'transform 95ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <path
                d="M6 6 L19.5 23 L22.5 20.5 L11.5 8.5 C9.6 6.5 7.6 5.5 6 6Z"
                fill="url(#bladeGold)"
                stroke="#0B0D10"
                strokeWidth="0.9"
              />
              <path
                d="M21 21 L30 32"
                stroke="url(#bladeGold)"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle
                cx="33.5"
                cy="36.5"
                r="5.5"
                stroke="url(#bladeGold)"
                strokeWidth="3"
                fill="rgba(11,13,16,0.55)"
              />
            </g>

            {/* Pivot Screw */}
            <circle cx="21" cy="21" r="2.6" fill="#0B0D10" stroke="#F5CB76" strokeWidth="1.4" />
          </svg>
        </div>
      </div>
    </>
  );
}
