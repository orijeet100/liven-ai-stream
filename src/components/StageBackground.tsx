import { useEffect, useRef, useState } from "react";

interface StageBackgroundProps {
  windowStart: number;
  isVideoPlaying: boolean;
}

export const StageBackground = ({ windowStart, isVideoPlaying }: StageBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isVideoPlaying) {
      video.play().catch((err) => {
        console.error('Failed to play video:', err);
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isVideoPlaying]);
  
  if (isVideoPlaying) {
    return (
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          src="/liven_video.mp4"
          className="absolute inset-0 w-full h-full object-contain"
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-background/30" />
      </div>
    );
  }
  
  // Default gradient background when video is not playing
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-background/30" />
    </div>
  );
};
