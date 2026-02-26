import { useRef, useCallback, useState } from "react";

export type SwipeDirection = "left" | "right" | null;

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [lastDirection, setLastDirection] = useState<SwipeDirection>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX.current;
      const deltaY = e.changedTouches[0].clientY - startY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX < 0) {
          setLastDirection("left");
          onSwipeLeft?.();
        } else {
          setLastDirection("right");
          onSwipeRight?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { onTouchStart, onTouchEnd, lastDirection };
}
