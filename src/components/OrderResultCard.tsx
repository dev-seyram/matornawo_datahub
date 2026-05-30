import { CheckCircle, Loader } from 'lucide-react';
import type { TrackedOrder } from '../types';
import { formatOrderDateTime, showStatusUpdatedAt } from '../lib/format';

export function OrderResultCard({ order }: { order: TrackedOrder }) {
  const placedLabel = formatOrderDateTime(order.date);
  const showUpdated = showStatusUpdatedAt(order.date, order.updatedAt);

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className={`px-6 py-4 flex items-center justify-between ${
        order.status === 'Delivered' ? 'bg-green-500' : order.status === 'Failed' ? 'bg-red-500' : order.status === 'Processing' ? 'bg-blue-600' : 'bg-amber-400'
      }`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Order Status</p>
          <p className="text-white font-extrabold text-lg mt-0.5">{order.status}</p>
          <p className="text-white/80 text-xs mt-1">Placed {placedLabel}</p>
        </div>
        {order.status === 'Delivered' ? (
          <CheckCircle className="w-8 h-8 text-white" />
        ) : (
          <Loader className="w-8 h-8 text-white animate-spin" />
        )}
      </div>
      <div className="px-6 py-5 space-y-0">
        {[
          { label: 'Order ID', value: order.orderId },
          { label: 'Network', value: order.network },
          { label: 'Package', value: order.package },
          { label: 'Phone', value: order.recipientPhone },
          { label: 'Placed', value: placedLabel },
          ...(showUpdated
            ? [{ label: 'Last updated', value: formatOrderDateTime(order.updatedAt) }]
            : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-400 font-medium">{label}</span>
            <span className="text-sm text-gray-800 font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
