import { useState } from 'react';
import { Loader } from 'lucide-react';
import { NetworkTabs } from '../components/NetworkTabs';
import { DataPackages } from '../components/DataPackages';
import type { Network, NetworkStates, Package, SelectedPackage } from '../types';

export function BuyData({
  onPackageSelect,
  packages,
  networkStates,
  loading,
  priceSyncing,
}: {
  onPackageSelect: (pkg: SelectedPackage) => void;
  packages: Package[];
  networkStates: NetworkStates;
  loading: boolean;
  priceSyncing: boolean;
}) {
  const [activeNetwork, setActiveNetwork] = useState<Network>('MTN');

  if (loading && packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-sm text-gray-500">Loading packages…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white shadow-sm sticky top-14 z-10">
        <NetworkTabs active={activeNetwork} onChange={setActiveNetwork} />
      </div>
      <div className="p-0">
        <DataPackages
          network={activeNetwork}
          packages={packages}
          onPackageSelect={onPackageSelect}
          networkState={networkStates[activeNetwork]}
          buyDisabled={priceSyncing}
        />
      </div>
    </div>
  );
}
