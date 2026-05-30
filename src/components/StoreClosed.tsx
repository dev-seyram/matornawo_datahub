import { Lock, MessageCircle } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';
import type { Network } from '../types';

export function StoreClosed({ network }: { network: Network }) {
  const { businessName, whatsappSupportNumber } = useSiteSettings();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="bg-gray-50 rounded-2xl p-12 max-w-md w-full flex flex-col items-center gap-4 border border-red-100">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <Lock className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-600">Store Currently Closed</h2>
        <p className="text-gray-400 text-center text-sm leading-relaxed">
          Our <span className="font-semibold text-gray-500">{network}</span> store is temporarily closed.
          Please check back later or contact us on WhatsApp.
        </p>
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
          className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle className="w-4 h-4" />
          Contact on WhatsApp
        </button>
      </div>
    </div>
  );
}
