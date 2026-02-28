import { useCallback, useRef } from "react";
import { useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";

export type SwipeDirection = "left" | "right" | null;

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  resistance?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60, resistance = 0.6 }: UseSwipeOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const x = useMotionValue(0);

  // Framer Motion Spring config matching iOS
  const springOptions = { damping: 20, stiffness: 200, mass: 0.8 };

  const onTouchStart = useCallback((e: React.TouchEvent | TouchEvent | MouseEvent) => {
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    startX.current = clientX;
    startY.current = clientY;
    isDragging.current = true;
    x.stop(); // Stop any ongoing springs to prevent stutter
  }, [x]);

  const onTouchMove = useCallback((e: React.TouchEvent | TouchEvent | MouseEvent) => {
    if (!isDragging.current) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;

    // Trigger horizontal swipe only if it primarily moves horizontally
    if (Math.abs(deltaX) > Math.abs(deltaY) + 10) {
      x.set(deltaX * resistance);
    }
  }, [x, resistance]);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent | TouchEvent | MouseEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      let clientX = 0;

      if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX;
      } else {
        clientX = (e as MouseEvent).clientX;
      }

      const deltaX = clientX - startX.current;

      if (Math.abs(deltaX) > threshold) {
        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }

      // Spring back to 0 immediately (Tab change handles the actual screen transition layer)
      animate(x, 0, springOptions);
    },
    [onSwipeLeft, onSwipeRight, threshold, x, springOptions]
  );

  return { onTouchStart, onTouchMove, onTouchEnd, x };
}
