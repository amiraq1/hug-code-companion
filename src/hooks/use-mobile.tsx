import * as React from "react";

const COMPACT_MOBILE_BREAKPOINT = 430;
const SHORT_MOBILE_HEIGHT = 820;

type MobileViewportState = {
  isCompactMobile: boolean;
  isLandscapeMobile: boolean;
  isShortMobileHeight: boolean;
  prefersReducedMotion: boolean;
};

export function useMobileViewport() {
  const [viewport, setViewport] = React.useState<MobileViewportState>({
    isCompactMobile: false,
    isLandscapeMobile: false,
    isShortMobileHeight: false,
    prefersReducedMotion: false,
  });

  React.useEffect(() => {
    const compactMql = window.matchMedia(`(max-width: ${COMPACT_MOBILE_BREAKPOINT}px)`);
    const landscapeMql = window.matchMedia("(max-width: 767px) and (orientation: landscape)");
    const shortHeightMql = window.matchMedia(`(max-width: 767px) and (max-height: ${SHORT_MOBILE_HEIGHT}px)`);
    const reducedMotionMql = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateViewport = () => {
      setViewport({
        isCompactMobile: compactMql.matches,
        isLandscapeMobile: landscapeMql.matches,
        isShortMobileHeight: shortHeightMql.matches,
        prefersReducedMotion: reducedMotionMql.matches,
      });
    };

    const listeners = [compactMql, landscapeMql, shortHeightMql, reducedMotionMql];

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
