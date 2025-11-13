import { useEffect, useState } from 'react';

export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newIsMobile = window.innerWidth <= 768;
        setIsMobile(newIsMobile);
      }, 50); // 减少延迟从 100ms 到 50ms
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);
  
  return {
    isMobile,
    isDesktop: !isMobile,
    deviceType: isMobile ? 'mobile' : 'desktop'
  };
};