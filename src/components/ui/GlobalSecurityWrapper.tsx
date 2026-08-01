'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export const GlobalSecurityWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      document.body.classList.remove('window-blurred');
      return;
    }
    
    // 1. Global Anti-Screenshot Keydown Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      const isScreenshotKey =
        e.key === 'PrintScreen' ||
        e.key === 'F12' ||
        e.key === 'Meta' ||
        (e.key === 's' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.ctrlKey && ['c', 'v', 'x', 'u', 'a', 'p', 's'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));

      if (isScreenshotKey) {
        e.preventDefault();
        document.body.classList.add('window-blurred');
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    };

    // 2. Global Window Blur & Focus Loss Blackout
    const handleBlur = () => {
      document.body.classList.add('window-blurred');
    };

    const handleFocus = () => {
      document.body.classList.remove('window-blurred');
    };

    const handleVisibility = () => {
      if (document.hidden) {
        document.body.classList.add('window-blurred');
      } else {
        document.body.classList.remove('window-blurred');
      }
    };

    // 3. Prevent Context Menu & Selection site-wide during exam
    const handleContextMenu = (e: MouseEvent) => {
      if (window.location.pathname.includes('/test/')) {
        e.preventDefault();
      }
    };

    // Attach Listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.classList.remove('window-blurred');
    };
  }, [isAdmin]);

  return <div className="min-h-screen">{children}</div>;
};
