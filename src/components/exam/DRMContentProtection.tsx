'use client';

import React, { useEffect, useState, useRef } from 'react';

interface DRMContentProtectionProps {
  children: React.ReactNode;
  isObfuscated?: boolean;
}

export const DRMContentProtection: React.FC<DRMContentProtectionProps> = ({
  children,
  isObfuscated = false,
}) => {
  const [isScreenCaptureDetected, setIsScreenCaptureDetected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Detect Screen Capture Media Devices
    const checkMediaDevices = async () => {
      try {
        if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
          const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
          navigator.mediaDevices.getDisplayMedia = async function (...args) {
            setIsScreenCaptureDetected(true);
            document.body.classList.add('window-blurred');
            return originalGetDisplayMedia.apply(this, args);
          };
        }
      } catch (err) {
        // Safe fallback
      }
    };

    // 2. Protect Canvas / WebGL context from external extraction
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      if (document.body.classList.contains('exam-protected-active')) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      }
      return originalToDataURL.apply(this, args);
    };

    checkMediaDevices();

    return () => {
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    };
  }, []);

  if (isObfuscated || isScreenCaptureDetected) {
    return (
      <div className="w-full min-h-[320px] p-8 bg-black text-white rounded-3xl border border-red-900/40 text-center select-none flex flex-col items-center justify-center gap-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-full bg-red-950/80 text-red-500 flex items-center justify-center border border-red-800/60 shadow-lg shadow-red-900/30">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h4 className="text-lg font-extrabold tracking-tight text-red-400 max-w-md leading-snug">
          Screen recording or screen sharing is not allowed during this examination.
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          Protected exam content has been hidden. Stop screen recording or restore focus to resume your examination.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none prevent-select transition-all duration-150 exam-protected-content"
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Netflix-style Protected Hardware Overlay Layer */}
      <div 
        aria-hidden="true"
        className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-5 bg-gradient-to-tr from-black via-transparent to-black"
      />
      {children}
    </div>
  );
};
