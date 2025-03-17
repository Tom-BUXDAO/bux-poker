'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export default function RotatePrompt() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    // Initial check
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
      <div className="text-center p-8">
        <RotateCcw className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-spin" />
        <h2 className="text-2xl font-bold text-white mb-2">Please Rotate Your Device</h2>
        <p className="text-gray-400">This page is best viewed in landscape mode</p>
      </div>
    </div>
  );
} 