'use client';

import { useEffect, useState } from 'react';

type ErrorToastProps = {
  message: string | null;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
};

export function ErrorToast({ message, onClose, autoClose = true, duration = 5000 }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onClose, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [message, autoClose, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed right-6 top-6 z-50 max-w-md transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="rounded-xl border border-red-500/50 bg-gradient-to-br from-red-900/90 to-red-950/90 p-4 shadow-2xl backdrop-blur-lg">
        <div className="flex items-start gap-3">
          {/* Error Icon */}
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-100">Generation Error</h3>
            <p className="mt-1 text-sm text-red-200/90">{message}</p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 rounded-lg p-1 text-red-300 transition-colors hover:bg-red-800/50 hover:text-red-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

type SuccessToastProps = {
  message: string | null;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
};

export function SuccessToast({ message, onClose, autoClose = true, duration = 3000 }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [message, autoClose, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed right-6 top-6 z-50 max-w-md transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="rounded-xl border border-emerald-500/50 bg-gradient-to-br from-emerald-900/90 to-emerald-950/90 p-4 shadow-2xl backdrop-blur-lg">
        <div className="flex items-start gap-3">
          {/* Success Icon */}
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Success Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-emerald-100">Success</h3>
            <p className="mt-1 text-sm text-emerald-200/90">{message}</p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 rounded-lg p-1 text-emerald-300 transition-colors hover:bg-emerald-800/50 hover:text-emerald-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

