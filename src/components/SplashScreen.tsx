import { useState, useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

const SplashScreen = ({ onFinish, duration = 2000 }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), duration - 500);
    const finishTimer = setTimeout(onFinish, duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src="/app-icon.png"
        alt="Hug Code"
        className="w-24 h-24 rounded-2xl mb-6 animate-pulse"
      />
      <h1 className="text-2xl font-bold text-primary font-['Space_Grotesk']">
        Hug Code
      </h1>
      <p className="text-muted-foreground text-sm mt-2">Mobile IDE</p>
    </div>
  );
};

export default SplashScreen;
