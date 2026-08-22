'use client';

import React, { useEffect } from 'react';
import { ViolationType } from '@/types';

interface AntiCheatingWrapperProps {
  children: React.ReactNode;
  onViolation: (type: ViolationType, details?: string) => void;
  enabled?: boolean;
}

export const AntiCheatingWrapper: React.FC<AntiCheatingWrapperProps> = ({
  children,
  onViolation,
  enabled = true,
}) => {
  useEffect(() => {
    if (!enabled) return;

    // 1. Prevent Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onViolation('context_menu', 'Right click attempted');
    };

    // 2. Prevent Copy, Cut, Paste
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation('copy_paste_attempt', `${e.type} attempted`);
    };

    // 3. Prevent Drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 4. Prevent Text Selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    // 5. Keyboard Shortcut Protection (F12, PrintScreen, Win+Shift+S, Ctrl+C, Ctrl+V, Meta, etc.)
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
        onViolation('copy_paste_attempt', `Blocked key / screenshot attempt: ${e.key}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    };

    // 6. Visibility Change & Tab Switch Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add('window-blurred');
        onViolation('visibility_lost', 'Switched tab or minimized browser window');
      } else {
        document.body.classList.remove('window-blurred');
      }
    };

    // 7. Window Blur & Focus Detection
    const handleWindowBlur = () => {
      document.body.classList.add('window-blurred');
      onViolation('window_minimized', 'Focus lost from exam browser window');
    };

    const handleWindowFocus = () => {
      document.body.classList.remove('window-blurred');
    };

    // 8. Fullscreen Change Detection
    const handleFullscreenChange = () => {
      const isFullscreenSupported = !!document.documentElement.requestFullscreen;
      if (isFullscreenSupported && !document.fullscreenElement) {
        onViolation('fullscreen_exit', 'Exited fullscreen mode');
      }
    };

    // 9. Mobile Screen Recording & Notification Shade Pull Detection
    const handleMobileFocusLoss = () => {
      document.body.classList.add('window-blurred');
      onViolation('window_minimized', 'Mobile notification shade or screen recording control triggered');
    };

    // 10. Multiple Tabs / Active Sessions Detection
    let sessionChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        sessionChannel = new BroadcastChannel('vamsi_exam_session_channel');
        sessionChannel.postMessage({ type: 'NEW_SESSION_PING', timestamp: Date.now() });

        sessionChannel.onmessage = (event) => {
          if (event.data?.type === 'NEW_SESSION_PING' || event.data?.type === 'SESSION_ALREADY_EXISTS') {
            document.body.classList.add('window-blurred');
            onViolation('multiple_tabs_detected', 'Multiple exam tabs or browser sessions detected.');
          }
        };
      }
    } catch (e) {
      // Safe fallback
    }

    // 11. DevTools Detection
    const devToolsCheckInterval = setInterval(() => {
      const startTime = performance.now();
      // Debugger timing check
      (function () {})['constructor']('debugger')();
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        document.body.classList.add('window-blurred');
        onViolation('devtools_opened', 'Developer Tools inspect execution detected.');
      }
    }, 1500);

    // 12. Prevent Printing
    const handleBeforePrint = () => {
      document.body.classList.add('window-blurred');
      onViolation('print_attempt', 'Browser print or PDF export command triggered.');
    };

    // 13. Mobile Hardware Screenshot Gesture Interception
    const handleTouchCancel = () => {
      document.body.classList.add('window-blurred');
      onViolation('screenshot_attempt', 'Mobile hardware interrupt (possible screenshot or screen recording) detected');
    };

    // 14. Prevent Browser Back Button
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      onViolation('visibility_lost', 'Attempted to use browser back navigation to leave the exam');
    };

    // Attach Event Listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handleMobileFocusLoss);
    window.addEventListener('orientationchange', handleMobileFocusLoss);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('touchcancel', handleTouchCancel);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearInterval(devToolsCheckInterval);
      if (sessionChannel) {
        sessionChannel.close();
      }
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handleMobileFocusLoss);
      window.removeEventListener('orientationchange', handleMobileFocusLoss);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.classList.remove('window-blurred');
    };
  }, [enabled, onViolation]);

  return (
    <div className="prevent-select no-drag min-h-screen">
      {children}
    </div>
  );
};
