import * as React from "react";

const COMPACT_MOBILE_BREAKPOINT = 430;
const SHORT_MOBILE_HEIGHT = 820;

type MobileViewportState = {
  isCompactMobile: boolean;
  isLandscapeMobile: boolean;
  isShortMobileHeight: boolean;
  prefersReducedMotion: boolean;
};

function getViewportState(): MobileViewportState {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return {
      isCompactMobile: false,
      isLandscapeMobile: false,
      isShortMobileHeight: false,
      prefersReducedMotion: false,
    };
  }

  return {
    isCompactMobile: window.matchMedia(`(max-width: ${COMPACT_MOBILE_BREAKPOINT}px)`).matches,
    isLandscapeMobile: window.matchMedia("(max-width: 767px) and (orientation: landscape)").matches,
    isShortMobileHeight: window.matchMedia(`(max-width: 767px) and (max-height: ${SHORT_MOBILE_HEIGHT}px)`).matches,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

export function useMobileViewport() {
  const [viewport, setViewport] = React.useState<MobileViewportState>(() => getViewportState());

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const compactMql = window.matchMedia(`(max-width: ${COMPACT_MOBILE_BREAKPOINT}px)`);
    const landscapeMql = window.matchMedia("(max-width: 767px) and (orientation: landscape)");
    const shortHeightMql = window.matchMedia(`(max-width: 767px) and (max-height: ${SHORT_MOBILE_HEIGHT}px)`);
    const reducedMotionMql = window.matchMedia("(prefers-reduced-motion: reduce)");

    const listeners = [compactMql, landscapeMql, shortHeightMql, reducedMotionMql];

    const updateViewport = () => {
      const next = {
        isCompactMobile: compactMql.matches,
        isLandscapeMobile: landscapeMql.matches,
        isShortMobileHeight: shortHeightMql.matches,
        prefersReducedMotion: reducedMotionMql.matches,
      };

      setViewport((prev) => {
        if (
          prev.isCompactMobile === next.isCompactMobile &&
          prev.isLandscapeMobile === next.isLandscapeMobile &&
          prev.isShortMobileHeight === next.isShortMobileHeight &&
          prev.prefersReducedMotion === next.prefersReducedMotion
        ) {
          return prev;
        }

        return next;
      });
    };

    for (const mql of listeners) {
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", updateViewport);
      } else if (typeof mql.addListener === "function") {
        mql.addListener(updateViewport);
      }
    }

    window.addEventListener("orientationchange", updateViewport);
    updateViewport();

    return () => {
      for (const mql of listeners) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", updateViewport);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(updateViewport);
        }
      }
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  return viewport;
}
