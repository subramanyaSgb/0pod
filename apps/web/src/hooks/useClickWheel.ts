import { useRef, useCallback, useEffect } from 'react';
import type { WheelZone } from '@0pod/shared';

const NOTCH_ANGLE = Math.PI / 12; // 15 degrees
const FRICTION = 0.92;
const MIN_VELOCITY = 0.002;
const TAP_THRESHOLD = Math.PI / 36; // 5 degrees
const LONG_PRESS_MS = 800;

interface WheelCallbacks {
  onRotate: (direction: 'cw' | 'ccw', notches: number) => void;
  onZoneTap: (zone: WheelZone) => void;
  onLongPress: (zone: WheelZone) => void;
}

function getAngle(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(y - cy, x - cx);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

function detectZone(
  x: number,
  y: number,
  cx: number,
  cy: number,
  radius: number,
): WheelZone {
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

  // Center button
  if (dist < radius * 0.3) return 'center';

  // Outside the wheel
  if (dist > radius) return 'ring';

  // Determine arc zone by angle
  const angle = getAngle(x, y, cx, cy);
  const degrees = ((angle * 180) / Math.PI + 360) % 360;

  if (degrees >= 315 || degrees < 45) return 'forward'; // right
  if (degrees >= 45 && degrees < 135) return 'playPause'; // bottom
  if (degrees >= 135 && degrees < 225) return 'back'; // left
  return 'menu'; // top (225-315)
}

export function useClickWheel(
  wheelRef: React.RefObject<HTMLDivElement | null>,
  callbacks: WheelCallbacks,
) {
  const stateRef = useRef({
    active: false,
    startAngle: 0,
    prevAngle: 0,
    totalAngle: 0,
    zone: 'ring' as WheelZone,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    momentumVelocity: 0,
    momentumRaf: 0,
    accumulatedNotches: 0,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getCenter = useCallback(() => {
    const el = wheelRef.current;
    if (!el) return { cx: 0, cy: 0, radius: 0 };
    const rect = el.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      radius: rect.width / 2,
    };
  }, [wheelRef]);

  const startMomentum = useCallback((velocity: number) => {
    const state = stateRef.current;
    state.momentumVelocity = velocity;

    const step = () => {
      state.momentumVelocity *= FRICTION;
      if (Math.abs(state.momentumVelocity) < MIN_VELOCITY) return;

      state.accumulatedNotches += state.momentumVelocity;
      const notches = Math.floor(Math.abs(state.accumulatedNotches));
      if (notches > 0) {
        const dir = state.momentumVelocity > 0 ? 'cw' : 'ccw';
        callbacksRef.current.onRotate(dir, notches);
        state.accumulatedNotches -=
          notches * Math.sign(state.accumulatedNotches);
      }

      state.momentumRaf = requestAnimationFrame(step);
    };
    state.momentumRaf = requestAnimationFrame(step);
  }, []);

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      const { cx, cy, radius } = getCenter();
      const state = stateRef.current;

      cancelAnimationFrame(state.momentumRaf);

      const angle = getAngle(clientX, clientY, cx, cy);
      const zone = detectZone(clientX, clientY, cx, cy, radius);

      state.active = true;
      state.startAngle = angle;
      state.prevAngle = angle;
      state.totalAngle = 0;
      state.zone = zone;
      state.accumulatedNotches = 0;

      // Start long press timer for center button and menu
      if (zone === 'center' || zone === 'menu') {
        state.longPressTimer = setTimeout(() => {
          callbacksRef.current.onLongPress(zone);
          state.active = false;
        }, LONG_PRESS_MS);
      }
    },
    [getCenter],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const state = stateRef.current;
      if (!state.active) return;

      const { cx, cy } = getCenter();
      const angle = getAngle(clientX, clientY, cx, cy);
      const delta = normalizeAngle(angle - state.prevAngle);

      state.totalAngle += delta;
      state.prevAngle = angle;

      // Cancel long press if movement detected
      if (Math.abs(state.totalAngle) > TAP_THRESHOLD && state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      // Calculate notches
      state.accumulatedNotches += delta / NOTCH_ANGLE;
      const notches = Math.floor(Math.abs(state.accumulatedNotches));
      if (notches > 0) {
        const dir = state.accumulatedNotches > 0 ? 'cw' : 'ccw';
        callbacksRef.current.onRotate(dir, notches);
        state.accumulatedNotches -=
          notches * Math.sign(state.accumulatedNotches);
      }
    },
    [getCenter],
  );

  const handleEnd = useCallback(() => {
    const state = stateRef.current;
    if (!state.active) return;

    state.active = false;

    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // If total movement is small, treat as a tap
    if (Math.abs(state.totalAngle) < TAP_THRESHOLD) {
      callbacksRef.current.onZoneTap(state.zone);
      return;
    }

    // Start momentum if on ring
    if (
      state.zone === 'ring' ||
      Math.abs(state.totalAngle) > TAP_THRESHOLD
    ) {
      const velocity = state.accumulatedNotches;
      if (Math.abs(velocity) > MIN_VELOCITY) {
        startMomentum(velocity);
      }
    }
  }, [startMomentum]);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };
    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleEnd();
    };
    // Desktop scroll wheel support
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 'cw' : 'ccw';
      callbacksRef.current.onRotate(dir, 1);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(stateRef.current.momentumRaf);
    };
  }, [wheelRef, handleStart, handleMove, handleEnd]);
}
