'use client';

import { useState, useEffect } from 'react';

const getInitialSize = () => {
  if (typeof window === 'undefined') return { isMobile: false, isTablet: false };
  
  const width = window.innerWidth;
  return {
    isMobile: width < 375,
    isTablet: width >= 375 && width < 640
  };
};

export default function useScreenSize() {
  const [isMobile, setIsMobile] = useState(getInitialSize().isMobile);
  const [isTablet, setIsTablet] = useState(getInitialSize().isTablet);

  useEffect(() => {
    const checkSize = () => {
      const { isMobile: mobile, isTablet: tablet } = getInitialSize();
      setIsMobile(mobile);
      setIsTablet(tablet);
    };

    // Check on mount
    checkSize();

    // Add resize listener
    window.addEventListener('resize', checkSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet };
} 