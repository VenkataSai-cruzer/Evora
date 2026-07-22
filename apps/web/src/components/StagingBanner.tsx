'use client';

import { useEffect, useState } from 'react';

export function StagingBanner() {
  const [isStaging, setIsStaging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsStaging(
      process.env.NEXT_PUBLIC_APP_ENV === 'staging'
    );
  }, []);

  if (!isStaging || !isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/90 text-amber-950 text-center text-xs font-bold py-1 px-4 backdrop-blur-sm">
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse" />
        STAGING ENVIRONMENT — TEST DATA ONLY
        <button
          onClick={() => setIsVisible(false)}
          className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600/50 hover:bg-amber-600 text-amber-950 text-xs leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </span>
    </div>
  );
}
