import { useState } from 'react';
import { Search } from 'lucide-react';
import { fetchOrderById, fetchOrdersByPhone, OrderTrackError } from '../api/client';
import { OrderResultCard } from '../components/OrderResultCard';
import type { TrackedOrder } from '../types';

type TrackMode = 'orderId' | 'phone';

export function TrackOrder({
  showToast,
}: {
  showToast: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void;
}) {
  const [mode, setMode] = useState<TrackMode>('orderId');
  const [query, setQuery] = useState('');
  const [singleResult, setSingleResult] = useState<TrackedOrder | null>(null);
  const [listResult, setListResult] = useState<TrackedOrder[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const trimmed = query.trim();
  const isValid =
    mode === 'orderId'
      ? /^ORD-[A-Z0-9]{8}$/i.test(trimmed)
      : /^0\d{9}$/.test(trimmed);

  const resetResults = () => {
    setSearched(false);
    setSingleResult(null);
    setListResult(null);
    setFetchError(null);
  };

  const switchMode = (next: TrackMode) => {
    setMode(next);
    setQuery('');
    resetResults();
  };

  const handleTrack = () => {
    if (!isValid) return;
    setLoading(true);
    setSearched(true);
    setSingleResult(null);
    setListResult(null);
    setFetchError(null);

    if (mode === 'orderId') {
      void fetchOrderById(trimmed.toUpperCase())
        .then((found) => setSingleResult(found))
        .catch((err) => {
          if (err instanceof OrderTrackError) {
            setFetchError(err.message);
            showToast(err.message, 'error', 'Tracking Error');
          } else {
            setFetchError('Could not load order. Please try again.');
            showToast('Could not load order. Please try again.', 'error', 'Tracking Error');
          }
        })
        .finally(() => setLoading(false));
      return;
    }

    void fetchOrdersByPhone(trimmed)
      .then((orders) => setListResult(orders))
      .catch((err) => {
        if (err instanceof OrderTrackError) {
          setFetchError(err.message);
          showToast(err.message, 'error', 'Tracking Error');
        } else {
          setFetchError('Could not load orders. Please try again.');
          showToast('Could not load orders. Please try again.', 'error', 'Tracking Error');
        }
      })
      .finally(() => setLoading(false));
  };

  const notFound =
    searched &&
    !loading &&
    !fetchError &&
    (mode === 'orderId' ? singleResult === null : (listResult?.length ?? 0) === 0);

  const hasSingleResult = searched && !loading && !fetchError && singleResult !== null;
  const hasListResults = searched && !loading && !fetchError && (listResult?.length ?? 0) > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-800">Track Order</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        Enter either your order ID or recipient phone to track your purchase
      </p>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        {([
          { id: 'orderId' as TrackMode, label: 'Order ID' },
          { id: 'phone' as TrackMode, label: 'Recipient Phone' },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchMode(tab.id)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
              mode === tab.id
                ? 'border-amber-400 text-amber-500 bg-gray-50'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 mb-8 bg-white rounded-b-xl shadow-sm p-4 border border-t-0 border-gray-100">
        <input
          type={mode === 'phone' ? 'tel' : 'text'}
          value={query}
          onChange={(e) => {
            const v =
              mode === 'phone'
                ? e.target.value.replace(/\D/g, '').slice(0, 10)
                : e.target.value.toUpperCase();
            setQuery(v);
            resetResults();
          }}
          onKeyDown={(e) => e.key === 'Enter' && isValid && handleTrack()}
          placeholder={
            mode === 'orderId'
              ? 'ENTER ORDER ID (E.G., ORD-ABC12345)'
              : 'RECIPIENT PHONE (E.G., 0551234567)'
          }
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
        />
        <button
          type="button"
          onClick={handleTrack}
          disabled={!isValid || loading}
          className="w-full bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-400 disabled:active:scale-100 text-gray-900 font-bold px-6 py-3 rounded-xl text-sm transition-all duration-150 shadow-sm"
        >
          {loading ? 'Tracking…' : 'Track'}
        </button>
      </div>

      {!searched && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-700 font-bold text-lg">Track Your Order</p>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            {mode === 'orderId'
              ? 'Enter the order ID you received after purchase'
              : 'Enter the recipient phone to see all orders sent to that number'}
          </p>
        </div>
      )}

      {searched && fetchError && !loading && (
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-3 border border-red-100">
          <p className="font-bold text-red-700">Could Not Load Orders</p>
          <p className="text-sm text-gray-500 text-center">{fetchError}</p>
        </div>
      )}

      {notFound && (
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <Search className="w-7 h-7 text-red-400" />
          </div>
          <p className="font-bold text-gray-700">No Orders Found</p>
          <p className="text-sm text-gray-400 text-center">
            {mode === 'orderId' ? (
              <>
                We couldn&apos;t find any order matching{' '}
                <span className="font-semibold text-gray-600">&quot;{trimmed.toUpperCase()}&quot;</span>.
                Please check the ID and try again.
              </>
            ) : (
              <>
                We couldn&apos;t find any orders for{' '}
                <span className="font-semibold text-gray-600">{trimmed}</span>.
                Please check the number and try again.
              </>
            )}
          </p>
        </div>
      )}

      {hasSingleResult && singleResult && <OrderResultCard order={singleResult} />}

      {hasListResults && listResult && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-medium">
            {listResult.length} order{listResult.length === 1 ? '' : 's'} found for this recipient
          </p>
          {listResult.map((order) => (
            <OrderResultCard key={order.orderId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
