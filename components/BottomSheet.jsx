'use client';

import { useState, useRef, useEffect, createContext, useContext } from 'react';
import './BottomSheet.css';

/* ─────────────────────────────────────────────────────────────────────────────
   SheetContext
   Lets any child (e.g. NavPill) request a snap change without prop-drilling.
   On desktop, setSnap is a no-op and snap is 'desktop'.
───────────────────────────────────────────────────────────────────────────── */
export const SheetContext = createContext({ snap: 'desktop', setSnap: () => {} });
export const useSheet = () => useContext(SheetContext);

/* ─────────────────────────────────────────────────────────────────────────────
   Snap point helpers
   Positions are translateY values (px from top of viewport).
   FULL   → nearly full-screen: 56px from top
   HALF   → 44% from top (~56% of screen visible)
   COLLAPSED → only 124px peeking above the bottom edge
───────────────────────────────────────────────────────────────────────────── */
const SNAP_NAMES = ['full', 'half', 'collapsed'];

function snapY(name, h) {
  if (name === 'full')      return 56;
  if (name === 'half')      return Math.round(h * 0.44);
  /* collapsed */           return h - 124;
}

/*
  Given the sheet's current Y position during/after a drag and the finger
  velocity (px/ms), returns the name of the snap point to animate to.
  Velocity drives "flick" behaviour: a fast drag snaps one step further
  in the drag direction rather than just picking the geometrically nearest point.
*/
function resolveSnap(currentY, h, velPxPerMs) {
  const FLICK_THRESHOLD = 0.35; // px/ms — above this counts as a flick

  let nearestIdx = 0;
  let nearestDist = Infinity;
  SNAP_NAMES.forEach((name, i) => {
    const d = Math.abs(snapY(name, h) - currentY);
    if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
  });

  if (velPxPerMs > FLICK_THRESHOLD) {
    /* Flicking downward → collapse one more step */
    nearestIdx = Math.min(nearestIdx + 1, SNAP_NAMES.length - 1);
  } else if (velPxPerMs < -FLICK_THRESHOLD) {
    /* Flicking upward → expand one more step */
    nearestIdx = Math.max(nearestIdx - 1, 0);
  }

  return SNAP_NAMES[nearestIdx];
}

/* ─────────────────────────────────────────────────────────────────────────────
   useIsMobile — SSR-safe media query hook
───────────────────────────────────────────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [isMobile, setIsMobile] = useState(null);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [bp]);
  return isMobile;
}

/* ─────────────────────────────────────────────────────────────────────────────
   BottomSheet
   On desktop: passes children through in a centered shell.
   On mobile:  renders a draggable sheet anchored to the bottom of the screen
               with three snap points (collapsed / half / full).

   Gesture architecture:
     • Touch listeners are attached imperatively (not via React props) so we
       can pass { passive: false } to touchmove and call preventDefault().
       Without this, browsers refuse to cancel the native scroll on the body.
     • The sheet position is manipulated directly via el.style.transform during
       a drag (skips React re-renders → 60 fps).
     • On touchend we resolve the target snap, set React state, and let the CSS
       transition animate to the final position.
───────────────────────────────────────────────────────────────────────────── */
export default function BottomSheet({ children, defaultSnap = 'collapsed' }) {
  const isMobile = useIsMobile();
  const [snap, setSnap] = useState(defaultSnap);

  /* Refs used inside imperative event listeners to avoid stale closures */
  const sheetRef  = useRef(null);
  const snapRef   = useRef(defaultSnap);
  useEffect(() => { snapRef.current = snap; }, [snap]);

  /* ── Apply CSS transition + final position whenever snap state changes ── */
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !isMobile) return;
    const h = window.innerHeight;
    el.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
    el.style.transform   = `translateY(${snapY(snap, h)}px)`;
  }, [snap, isMobile]);

  /* ── Attach non-passive touch listeners to the drag handle zone only ── */
  useEffect(() => {
    const handle = sheetRef.current?.querySelector('[data-sheet-handle]');
    if (!handle || !isMobile) return;

    let startTouchY    = 0;
    let startTranslate = 0;
    let lastY          = 0;
    let lastTime       = 0;
    let velocity       = 0;   // px/ms at release

    function onTouchStart(e) {
      const h = window.innerHeight;
      const t = e.touches[0];
      startTouchY    = t.clientY;
      startTranslate = snapY(snapRef.current, h);
      lastY          = t.clientY;
      lastTime       = Date.now();
      velocity       = 0;

      /* Disable CSS transition during drag so position tracks finger exactly */
      const el = sheetRef.current;
      if (el) el.style.transition = 'none';
    }

    function onTouchMove(e) {
      /* Prevent native body scroll while dragging the sheet */
      e.preventDefault();

      const t   = e.touches[0];
      const now = Date.now();
      const dt  = now - lastTime;
      if (dt > 0) velocity = (t.clientY - lastY) / dt;
      lastY    = t.clientY;
      lastTime = now;

      const h     = window.innerHeight;
      const delta = t.clientY - startTouchY;
      /* Clamp: can't drag above 40px from top or below collapsed position */
      const newY  = Math.max(40, Math.min(h - 80, startTranslate + delta));

      const el = sheetRef.current;
      if (el) el.style.transform = `translateY(${newY}px)`;
    }

    function onTouchEnd() {
      const el = sheetRef.current;
      const h  = window.innerHeight;

      /* Read current Y from the inline style that onTouchMove set */
      const match    = el?.style.transform.match(/translateY\(([0-9.]+)px\)/);
      const currentY = match ? parseFloat(match[1]) : snapY(snapRef.current, h);

      const target = resolveSnap(currentY, h, velocity);

      /* Re-enable transition and animate to snap target */
      if (el) {
        el.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform   = `translateY(${snapY(target, h)}px)`;
      }
      setSnap(target);
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    handle.addEventListener('touchmove',  onTouchMove,  { passive: false });
    handle.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      handle.removeEventListener('touchstart', onTouchStart);
      handle.removeEventListener('touchmove',  onTouchMove);
      handle.removeEventListener('touchend',   onTouchEnd);
    };
  }, [isMobile]);

  /* ── Set initial position without animation on first mount ── */
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !isMobile) return;
    const h = window.innerHeight;
    el.style.transition = 'none';
    el.style.transform  = `translateY(${snapY(defaultSnap, h)}px)`;
    /* Force reflow so the next transition won't animate from 0 */
    void el.offsetHeight;
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── SSR / hydration guard: don't render until the viewport is known ── */
  if (isMobile === null) return null;

  /* ── Desktop: pass children through in a centred layout shell ── */
  if (isMobile === false) {
    return (
      <SheetContext.Provider value={{ snap: 'desktop', setSnap: () => {} }}>
        <div className="bs-desktop-shell">{children}</div>
      </SheetContext.Provider>
    );
  }

  /* ── Mobile (isMobile === null during SSR → renders sheet skeleton) ── */
  return (
    <SheetContext.Provider value={{ snap, setSnap }}>
      <div ref={sheetRef} className="bs-sheet">

        {/* ── Drag handle zone (touch target for swipe gestures) ── */}
        <div className="bs-handle-zone" data-sheet-handle>
          <div className="bs-handle" />
        </div>

        {/* ── Content area (NavPill fields + suggestions scroll inside here) ── */}
        <div className="bs-content">
          {children}
        </div>

      </div>
    </SheetContext.Provider>
  );
}
