import React, { useState, useEffect, ReactNode, memo } from 'react';

export interface MobileStackProps {
    activeScreen: string;
    screens: Record<string, ReactNode>;
    onBack?: () => void;
}

export const MobileStack = memo(({ activeScreen, screens, onBack }: MobileStackProps) => {
    const [stack, setStack] = useState<string[]>([activeScreen]);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

    // Push / Pop logic
    useEffect(() => {
        const currentIndex = stack.indexOf(activeScreen);

        if (currentIndex === -1) {
            // It's a new screen, push it onto the stack (Forward transition)
            setSlideDirection('forward');
            setIsTransitioning(true);
            setStack((prev) => [...prev, activeScreen]);
        } else if (currentIndex < stack.length - 1) {
            // It's a screen already in the stack, we are popping (Backward transition)
            setSlideDirection('backward');
            setIsTransitioning(true);
            // Wait for animation before removing from DOM
            setTimeout(() => {
                setStack((prev) => prev.slice(0, currentIndex + 1));
                setIsTransitioning(false);
            }, 350); // Matches iOS/Native transition duration
        }
    }, [activeScreen, stack]);

    useEffect(() => {
        if (slideDirection === 'forward' && isTransitioning) {
            const timer = setTimeout(() => setIsTransitioning(false), 350);
            return () => clearTimeout(timer);
        }
    }, [slideDirection, isTransitioning]);

    return (
        <div className="relative w-full h-[100dvh] overflow-hidden bg-background perspective-1000">
            {stack.map((screenId, index) => {
                const isTop = index === stack.length - 1;
                const isPrevious = index === stack.length - 2;
                const isPopping = isTransitioning && slideDirection === 'backward' && isTop;
                const isPushing = isTransitioning && slideDirection === 'forward' && isTop;
                const Content = screens[screenId];

                if (!Content) return null;

                // Hide screens deeper than 1 to optimize DOM
                if (index < stack.length - 2 && !isPopping) return null;

                let transformClass = "translate-x-0";
                let opacityClass = "opacity-100";
                let zIndex = index * 10;

                // Native iOS Transition Replication
                if (isPushing) {
                    transformClass = "translate-x-full animate-slide-in-right-native";
                    opacityClass = "opacity-100";
                } else if (isPopping) {
                    transformClass = "translate-x-full animate-slide-out-right-native";
                    zIndex = (index + 1) * 10; // keep it on top while it slides out
                } else if (!isTop && isPrevious) {
                    // Being pushed away or waiting behind top screen
                    transformClass = isTransitioning && slideDirection === 'forward'
                        ? "translate-x-0 animate-scale-down-native"
                        : "-translate-x-[20%] opacity-30 scale-95";
                }

                const baseStyles = "absolute inset-0 w-full h-full shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-background will-change-transform transform-gpu";

                return (
                    <div
                        key={screenId}
                        className={`${baseStyles} ${transformClass} ${opacityClass}`}
                        style={{
                            zIndex,
                            // Enforce strictly no animation if not transitioning, rely on classes during transition
                            transition: isTransitioning ? 'none' : 'transform 0s, opacity 0s'
                        }}
                    >
                        {Content}
                    </div>
                );
            })}
        </div>
    );
});

MobileStack.displayName = 'MobileStack';
