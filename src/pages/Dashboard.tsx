import { useState } from 'react';
import { Clock, MessageCircle, UserPlus, Users } from 'lucide-react';
import happyCustomer from '../assets/happy-customer.png';
import { NetworkTabs } from '../components/NetworkTabs';
import { DataPackages } from '../components/DataPackages';
import { PromoCarousel } from '../components/PromoCarousel';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';
import type { Network, NetworkStates, Package, PromoSlide, SelectedPackage } from '../types';

export function Dashboard({
  showToast,
  onPackageSelect,
  packages,
  networkStates,
  promoSlides,
  priceSyncing,
}: {
  showToast: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void;
  onPackageSelect: (pkg: SelectedPackage) => void;
  packages: Package[];
  networkStates: NetworkStates;
  promoSlides: PromoSlide[];
  priceSyncing: boolean;
}) {
  const { businessName, whatsappSupportNumber } = useSiteSettings();
  const [activeNetwork, setActiveNetwork] = useState<Network>('MTN');

  return (
    <div>
      <div className="relative overflow-hidden" style={{ height: '340px' }}>
        <img
          src={happyCustomer}
          alt="Happy customer with phone"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Welcome</p>
          <h1 className="text-3xl font-extrabold text-white text-center">Hello, Guest!</h1>
          <p className="text-gray-300 text-sm text-center">Buy affordable data bundles instantly</p>
          <PromoCarousel slides={promoSlides} />
          <button
            onClick={() => showToast('Agent registration is coming soon!', 'info')}
            className="mt-1 flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800 text-white text-sm font-semibold px-6 py-2.5 rounded-full border border-gray-700 transition-colors duration-200"
          >
            <UserPlus className="w-4 h-4" />
            Become an Agent
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl shadow-md max-w-xl mx-auto overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Operating Hours</span>
            </div>
            <span className="text-amber-500 font-bold text-sm">24/7</span>
          </div>
          <div className="px-5 py-4 border-b border-gray-100">
            <button
              onClick={() =>
                window.open(
                  buildWhatsAppUrl(
                    whatsappSupportNumber,
                    `Hello ${businessName}, I need help with my order.\n\nOrder ID: \nRecipient Number: \nIssue: `
                  ),
                  '_blank'
                )
              }
              className="w-full flex items-center gap-2 text-white font-semibold text-sm py-2 px-3 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="w-4 h-4" />
              Contact Customer Service
            </button>
          </div>
          <div className="px-5 py-4">
            <button
              onClick={() => window.open('https://chat.whatsapp.com/HurIqeocS9MFHXM6x2rCiF?mode=gi_t', '_blank')}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all duration-200 text-sm hover:opacity-90"
              style={{ backgroundColor: '#22C55E' }}
            >
              <Users className="w-4 h-4" />
              Join Community
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Choose Network Provider</h2>
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <NetworkTabs active={activeNetwork} onChange={setActiveNetwork} />
            <DataPackages
              network={activeNetwork}
              packages={packages}
              onPackageSelect={onPackageSelect}
              networkState={networkStates[activeNetwork]}
              buyDisabled={priceSyncing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
