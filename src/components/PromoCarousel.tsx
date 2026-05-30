import { useState, useEffect } from 'react';
import type { PromoSlide } from '../types';

export function PromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const sorted = [...slides].sort((a, b) => a.index - b.index);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (sorted.length <= 1) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % sorted.length),
      5000
    );
    return () => window.clearInterval(id);
  }, [sorted.length]);

  if (sorted.length === 0) return null;

  const slide = sorted[active] ?? sorted[0];

  return (
    <div className="mt-2 w-full max-w-lg">
      <div
        className="rounded-2xl px-8 py-4 shadow-xl transition-colors duration-500"
        style={{ backgroundColor: slide.backgroundColor }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-white/85">{slide.title}</p>
        <p className="text-white font-bold text-base mt-1">{slide.headline}</p>
        <div className="flex gap-1.5 mt-3">
          {sorted.map((s, i) => (
            <button
              key={s.index}
              type="button"
              aria-label={`Show promo slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-opacity ${
                i === active ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
