import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader, X, CreditCard } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';
import { loadPaystackScript } from '../lib/paystack';
import { generateOrderId, verifyPayment } from '../api/client';
import type { Network, SelectedPackage } from '../types';

export function BuyModal({
  isOpen,
  onClose,
  selectedPackage,
  showToast,
  priceSyncing,
  validateBeforePaystack,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: SelectedPackage | null;
  showToast: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void;
  priceSyncing: boolean;
  validateBeforePaystack: () => Promise<SelectedPackage | null>;
}) {
  const { businessName, whatsappOrderReminderEnabled, whatsappSupportNumber } = useSiteSettings();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({});
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{ whatsappURL: string } | null>(null);
  const paymentCompletedRef = useRef(false);
  const paidAmountsRef = useRef({ price: 0, serviceFee: 0, total: 0 });

  useEffect(() => {
    if (!isOpen) {
      paymentCompletedRef.current = false;
      setOrderComplete(false);
      setPaymentSuccess(null);
      setPhone('');
      setEmail('');
      setErrors({});
      setProcessing(false);
      return;
    }
    void loadPaystackScript().catch(() => {
      // Pay button will show a friendly message if script failed
    });
  }, [isOpen]);

  if (!isOpen || !selectedPackage) return null;

  const displayPrice = selectedPackage.price;
  // Must match lib/validate.js calculateFees — server verifies Paystack amount against that total
  const displayServiceFee = Math.round(displayPrice * 0.02 * 100) / 100;
  const displayTotal = Math.round((displayPrice + displayServiceFee) * 100) / 100;

  const validateForm = (): boolean => {
    const newErrors: { phone?: string; email?: string } = {};
    if (!phone || phone.length !== 10 || !/^0/.test(phone) || !/^\d+$/.test(phone)) {
      newErrors.phone = 'Phone must be 10 digits starting with 0';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openPaystack = (verifiedPackage: SelectedPackage) => {
    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    if (!paystackPublicKey || paystackPublicKey.includes('REPLACE')) {
      showToast('Payment is not configured. Please contact support.', 'error', 'Payment Error');
      return;
    }
    if (paystackPublicKey.startsWith('sk_')) {
      showToast('Payment is not configured. Please contact support.', 'error', 'Payment Error');
      return;
    }

    const price = verifiedPackage.price;
    const serviceFee = Math.round(price * 0.02 * 100) / 100;
    const total = Math.round((price + serviceFee) * 100) / 100;
    paidAmountsRef.current = { price, serviceFee, total };

    const orderId = generateOrderId();
    const recipientPhone = phone;
    const network = verifiedPackage.network;
    const packageSize = verifiedPackage.size;
    const amountInPesewas = Math.round(total * 100);

    if (amountInPesewas < 10) {
      showToast('Minimum payment is GH₵0.10', 'error', 'Payment Error');
      return;
    }

    // Guard: Paystack inline script must be loaded before proceeding
    if (typeof (window as any).PaystackPop === 'undefined') {
      showToast('Payment system is still loading. Please try again in a moment.', 'error', 'Payment Error');
      return;
    }

    setProcessing(true);

    // Ghana Mobile Money providers supported:
    // - MTN Mobile Money (MoMo)
    // - AirtelTigo Money
    // - Telecel Cash
    // channels: ['mobile_money'] restricts to these only — no card payments
    // Amount always in Pesewas: GHS × 100
    // Minimum: GH₵0.10 = 10 Pesewas

    const handler = (window as any).PaystackPop.setup({
      key: paystackPublicKey,
      email: email,
      amount: amountInPesewas,
      currency: 'GHS',
      ref: orderId,
      label: recipientPhone,
      channels: ['mobile_money'],
      metadata: {
        custom_fields: [
          { display_name: 'Network', variable_name: 'network', value: network },
          { display_name: 'Data Package', variable_name: 'package', value: packageSize },
          { display_name: 'Recipient Phone', variable_name: 'recipient_phone', value: recipientPhone },
        ],
      },
      callback: function (response: { reference: string }) {
        void handlePaymentSuccess(response.reference, orderId, network, packageSize, recipientPhone);
      },
      onClose: function () {
        handlePaymentClosed();
      },
    });

    handler.openIframe();
  };

  const handlePaystackPayment = async () => {
    if (!validateForm()) return;
    try {
      await loadPaystackScript();
    } catch {
      showToast('Payment system is still loading. Please try again in a moment.', 'error', 'Payment Error');
      return;
    }
    const verifiedPackage = await validateBeforePaystack();
    if (!verifiedPackage) return;
    openPaystack(verifiedPackage);
  };

  const handlePaymentSuccess = async (
    reference: string,
    orderId: string,
    orderNetwork: Network,
    orderPackageSize: string,
    recipientPhone: string
  ) => {
    setProcessing(true);

    try {
      await verifyPayment({
        reference,
        orderId,
        network: orderNetwork,
        package: orderPackageSize,
        recipientPhone,
        email,
      });
    } catch (err) {
      const serverMessage = err instanceof Error ? err.message : 'Unknown server error';
      console.error('verifyPayment failed:', err);
      showToast(`Order ID: ${orderId} — ${serverMessage}`, 'error', 'Payment Error');
      setProcessing(false);
      return;
    }

    showToast(
      `Payment successful! Your ${orderPackageSize} bundle is being sent to ${recipientPhone}`,
      'success',
      'Payment Successful'
    );

    paymentCompletedRef.current = true;
    setOrderComplete(true);
    setProcessing(false);

    if (whatsappOrderReminderEnabled) {
      const { price: paidPrice, serviceFee: paidFee, total: paidTotal } = paidAmountsRef.current;
      const orderDate = new Date().toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const message = `🌐 *${businessName} — ORDER CONFIRMATION*

✅ *Payment Successful!*

📋 *Order Details:*
- Order ID: ${orderId}
- Network: ${orderNetwork}
- Package: ${orderPackageSize}
- Recipient Number: ${recipientPhone}

💰 *Payment Summary:*
- Bundle Price: GH₵${paidPrice.toFixed(2)}
- Service Fee (2%): GH₵${paidFee.toFixed(2)}
- Total Paid: GH₵${paidTotal.toFixed(2)}

📅 Date: ${orderDate}
🔖 Paystack Ref: ${reference}

_Please send this message as a reminder of your order. Your data bundle will be sent to ${recipientPhone} shortly._

Thank you for choosing ${businessName}! 🙏`;

      setPaymentSuccess({ whatsappURL: buildWhatsAppUrl(whatsappSupportNumber, message) });
    } else {
      setPaymentSuccess(null);
    }
  };

  const handlePaymentClosed = () => {
    setProcessing(false);
    if (paymentCompletedRef.current) return;
    showToast('Payment cancelled. Your order was not placed.', 'info', 'Payment Cancelled');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>
        <div className={`px-6 py-5 flex items-start justify-between relative ${
          selectedPackage.network === 'MTN' ? 'bg-amber-400' : selectedPackage.network === 'AirtelTigo' ? 'bg-blue-600' : 'bg-red-500'
        }`}>
          <div className="flex items-center gap-3">
            <div className="bg-gray-900/30 px-3 py-1.5 rounded-full">
              <p className="text-xs font-bold text-white/90 uppercase tracking-widest">{selectedPackage.network}</p>
            </div>
            <p className="text-3xl font-extrabold text-white">{selectedPackage.size}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80 uppercase tracking-widest font-semibold">Price</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">GH₵{selectedPackage.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-white/20 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {orderComplete ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <p className="text-lg font-bold text-gray-800">Payment Successful!</p>
              {paymentSuccess ? (
                <>
                  <p className="text-sm text-gray-500">
                    Your order has been placed. Send your confirmation on WhatsApp so we can process your bundle.
                  </p>
                  <button
                    onClick={() => window.open(paymentSuccess.whatsappURL, '_blank')}
                    style={{ backgroundColor: '#25D366' }}
                    className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl mt-3"
                  >
                    Send Order Confirmation on WhatsApp
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Your order has been placed. We will process your bundle shortly.
                </p>
              )}
            </div>
          ) : (
          <>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipient Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(v); }}
              placeholder="0551234567"
              disabled={processing}
              className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm focus:outline-none transition-colors ${errors.phone ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-amber-400'}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email for Receipt</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={processing}
              className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm focus:outline-none transition-colors ${errors.email ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-amber-400'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Package:</span>
              <span className="font-semibold text-gray-800">{selectedPackage.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-gray-800">GH₵{selectedPackage.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service (2%):</span>
              <span className="font-semibold text-gray-800">GH₵{displayServiceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Total:</span>
              <span className="font-extrabold text-amber-500">GH₵{displayTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => void handlePaystackPayment()}
            disabled={processing || priceSyncing}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500 active:scale-95 text-white font-bold py-3 rounded-xl transition-all duration-150 text-sm"
          >
            {processing ? (
              <><Loader className="w-4 h-4 animate-spin" />Processing...</>
            ) : priceSyncing ? (
              <><Loader className="w-4 h-4 animate-spin" />Checking prices…</>
            ) : (
              <><CreditCard className="w-4 h-4" />Pay with Paystack</>
            )}
          </button>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
