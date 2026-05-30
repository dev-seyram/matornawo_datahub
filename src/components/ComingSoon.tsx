import { Rocket } from 'lucide-react';
import type { Network } from '../types';

export function ComingSoon({ network }: { network: Network }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="bg-gray-50 rounded-2xl p-12 max-w-md w-full flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <Rocket className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-600">Coming Soon</h2>
        <p className="text-gray-400 text-center text-sm leading-relaxed">
          We're working on bringing you the best{' '}
          <span className="font-semibold text-gray-500">{network}</span> bundles. Check back soon!
        </p>
      </div>
    </div>
  );
}
