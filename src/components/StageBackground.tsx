import { useEffect, useState } from "react";

const backgrounds = [
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80",
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80",
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80",
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=80",
  "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1920&q=80",
  "https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1920&q=80",
  "https://images.unsplash.com/photo-1557682260-96773eb01377?w=1920&q=80",
];

interface StageBackgroundProps {
  windowStart: number;
}

export const StageBackground = ({ windowStart }: StageBackgroundProps) => {
  const [bgIndex, setBgIndex] = useState(0);
  
  useEffect(() => {
    // Change background for each new window
    setBgIndex(Math.floor(windowStart / 4) % backgrounds.length);
  }, [windowStart]);
  
  return (
    <div
      className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: `url(${backgrounds[bgIndex]})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-background/30" />
    </div>
  );
};
