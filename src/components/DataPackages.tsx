import { Wifi } from 'lucide-react';
import { ComingSoon } from './ComingSoon';
import { StoreClosed } from './StoreClosed';
import type { Network, NetworkState, Package, SelectedPackage } from '../types';

export function DataPackages({
  network,
  packages,
  onPackageSelect,
  networkState,
  buyDisabled = false,
}: {
  network: Network;
  packages: Package[];
  onPackageSelect: (pkg: SelectedPackage) => void;
  networkState: NetworkState;
  buyDisabled?: boolean;
}) {
  const networkPackages = packages.filter((p) => p.network === network);

  if (networkState === 'disabled') return <ComingSoon network={network} />;
  if (networkState === 'closed') return <StoreClosed network={network} />;
  if (networkPackages.length === 0) return <ComingSoon network={network} />;

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Wifi className="w-4 h-4 text-amber-400" />
        <h2 className="text-base font-bold text-gray-800">{network} Data Packages</h2>
      </div>
      <p className="text-sm text-gray-400 mb-5">Choose your preferred bundle</p>
      <div className="grid grid-cols-2 gap-3">
        {networkPackages.map((pkg) => {
          const brandColor = network === 'MTN' ? 'bg-amber-400' : network === 'AirtelTigo' ? 'bg-blue-600' : 'bg-red-500';
          const brandTextColor = network === 'MTN' ? 'text-amber-900' : 'text-white';
          return (
            <div key={pkg.id} className="rounded-xl overflow-hidden shadow-md">
              <div className={`${brandColor} px-4 py-3`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${brandTextColor}`}>{network}</p>
                <p className={`text-2xl font-extrabold ${network === 'MTN' ? 'text-gray-900' : 'text-white'} mt-0.5`}>{pkg.size}</p>
                <p className={`text-xs ${network === 'MTN' ? 'text-amber-800' : 'text-white/80'} font-medium`}>{pkg.validity}</p>
              </div>
              <div className="bg-gray-900 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Price</p>
                <p className="text-xl font-extrabold text-white mt-0.5">GH₵{pkg.price.toFixed(2)}</p>
                <button
                  onClick={() => onPackageSelect({ size: pkg.size, price: pkg.price, network })}
                  disabled={buyDisabled}
                  className="w-full mt-3 bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-400 disabled:active:scale-100 text-gray-900 font-bold text-sm py-1.5 rounded-lg transition-all duration-150"
                >
                  {buyDisabled ? 'Checking…' : 'Buy Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
