'use client';

import { useEffect, useState } from 'react';

interface HydrationSafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function HydrationSafeWrapper({ 
  children, 
  fallback = null 
}: HydrationSafeWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // During SSR and before hydration, render fallback or null
  if (!isHydrated) {
    return fallback;
  }

  // After hydration, render the actual children
  return children;
} 