import type { Network } from '../types';

export function NetworkTabs({ active, onChange }: { active: Network; onChange: (n: Network) => void }) {
  const tabs: { label: Network; activeColor: string }[] = [
    { label: 'MTN', activeColor: 'border-amber-400 text-amber-500' },
    { label: 'AirtelTigo', activeColor: 'border-blue-600 text-blue-600' },
    { label: 'Telecel', activeColor: 'border-red-500 text-red-500' },
  ];
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={() => onChange(tab.label)}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            active === tab.label
              ? `${tab.activeColor} bg-gray-50`
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
