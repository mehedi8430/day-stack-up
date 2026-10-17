"use client";

import { useEffect, useRef } from "react";

/**
 * Muted, looping promo video for the landing hero.
 * Autoplays unless the visitor prefers reduced motion (poster shows instead).
 */
export function LandingPromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void video.play().catch(() => {});
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
      <video
        ref={videoRef}
        className="block aspect-video w-full"
        src="/promo/daystackup-promo.mp4"
        poster="/promo/daystackup-promo-poster.jpg"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="DayStackUp product walkthrough video"
      />
    </div>
  );
}
