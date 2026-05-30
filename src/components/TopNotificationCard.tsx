import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import type { TopNotificationVariant } from '../types';

export function TopNotificationCard({
  title,
  description,
  variant = 'error',
  durationMs = 30000,
  onDismiss,
  topOffsetClass,
  layout = 'customer',
}: {
  title: string;
  description: string;
  variant?: TopNotificationVariant;
  durationMs?: number;
  onDismiss: () => void;
  topOffsetClass: string;
  layout?: 'customer' | 'admin';
}) {
  const [progress, setProgress] = useState(100);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (elapsed >= durationMs) {
        onDismissRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [durationMs]);

  const styles =
    variant === 'error'
      ? {
          border: 'border-red-500',
          title: 'text-red-700',
          progress: 'bg-red-500',
          iconWrap: 'bg-red-50',
        }
      : variant === 'success'
        ? {
            border: 'border-green-500',
            title: 'text-green-700',
            progress: 'bg-green-500',
            iconWrap: 'bg-green-50',
          }
        : {
            border: 'border-blue-500',
            title: 'text-blue-700',
            progress: 'bg-blue-500',
            iconWrap: 'bg-blue-50',
          };

  const positionClass =
    layout === 'admin' ? 'fixed left-0 right-0 z-[60]' : 'fixed left-0 right-0 md:left-[288px] z-[60]';

  return (
    <div className={`${positionClass} px-4 pointer-events-none ${topOffsetClass}`} role="alert">
      <div
        className={`top-notification-slide-in relative pointer-events-auto max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${styles.border} border-l-4`}
      >
        <div className="flex gap-3 p-4 pb-5 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.iconWrap}`}>
            {variant === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : variant === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Info className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className={`font-bold text-sm ${styles.title}`}>{title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-snug">{description}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className={`h-full transition-[width] duration-75 ease-linear ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
