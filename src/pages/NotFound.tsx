import { MessageCircle } from 'lucide-react';
import notFoundBg from '../assets/not-found-bg.png';
import { BrandLogo } from '../components/BrandLogo';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';

export function NotFound({ onGoHome }: { onGoHome: () => void }) {
  const { businessName, whatsappSupportNumber } = useSiteSettings();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${notFoundBg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />

      {/* Dark gradient overlay — darker at bottom, lighter at top to show face */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* Amber glow effect at bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 w-96 h-64 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: '#FFC107' }}
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <BrandLogo className="w-10 h-10 shadow-lg" />
          <span className="text-white font-bold text-xl tracking-tight">{businessName}</span>
        </div>

        {/* 404 */}
        <h1
          className="font-black mb-0 leading-none"
          style={{
            fontSize: 'clamp(100px, 20vw, 180px)',
            background: 'linear-gradient(135deg, #FFC107 0%, #FFD54F 50%, #FF8F00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 4px 24px rgba(255,193,7,0.4))',
          }}
        >
          404
        </h1>

        {/* Divider line */}
        <div className="w-24 h-1 rounded-full bg-amber-400 mb-6 mt-2 opacity-80" />

        <h2 className="text-white text-2xl md:text-3xl font-bold mb-3 tracking-tight">
          Page Not Found
        </h2>

        <p className="text-gray-300 text-sm md:text-base max-w-sm mb-10 leading-relaxed">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm">
          <button
            onClick={onGoHome}
            className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-900 text-sm shadow-lg hover:shadow-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-200"
            style={{ backgroundColor: '#FFC107' }}
          >
            🏠 Go Home
          </button>

          <button
            onClick={() => window.open(buildWhatsAppUrl(whatsappSupportNumber, `Hello ${businessName}, I need help.`), '_blank')}
            className="flex-1 py-3 px-6 rounded-xl font-bold text-white text-sm shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="w-4 h-4" />
            Get Help
          </button>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-xs mt-12">
          © {new Date().getFullYear()} {businessName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
