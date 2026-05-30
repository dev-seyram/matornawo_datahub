import type { Notice } from '../types';

export function NoticeTicker({ notices }: { notices: Notice[] }) {
  const activeNotices = notices.filter((n) => n.active);
  if (activeNotices.length === 0) return null;

  const line = activeNotices.map((n) => n.message).join('   ◆   ');

  return (
    <div
      className="fixed top-14 left-0 right-0 md:left-[288px] z-20 h-8 flex items-center overflow-hidden border-b border-amber-400/20"
      style={{ backgroundColor: '#1a1a1a' }}
      aria-live="polite"
    >
      <div className="notice-marquee-track text-xs font-medium tracking-wide text-amber-400">
        <span className="px-10">{line}</span>
        <span className="px-10" aria-hidden="true">
          {line}
        </span>
      </div>
    </div>
  );
}
