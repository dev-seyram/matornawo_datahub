import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { LayoutDashboard, ShoppingCart, Search, UserPlus, Clock, Wifi, Users, Rocket, User, ChevronRight, CheckCircle, Loader, Database, X, CreditCard, LogOut, CreditCard as Edit2, Trash2, Plus, MessageCircle, Menu, Lock, Megaphone, Linkedin, Settings } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import notFoundBg from './assets/not-found-bg.png';
import happyCustomer from './assets/happy-customer.png';

type Page = 'dashboard' | 'buy-data' | 'track-order' | 'admin' | 'not-found';
type Network = 'MTN' | 'AirtelTigo' | 'Telecel';
type NetworkState = 'active' | 'disabled' | 'closed';
type NetworkStates = Record<Network, NetworkState>;
type AdminTab = 'orders' | 'packages' | 'networks' | 'notices' | 'promos' | 'settings';

interface SiteSettings {
  businessName: string;
  whatsappOrderReminderEnabled: boolean;
}

const DEFAULT_BUSINESS_NAME = 'MATOE CONNECT';
const WHATSAPP_SUPPORT_NUMBER = '233534764068';

const defaultSiteSettings: SiteSettings = {
  businessName: DEFAULT_BUSINESS_NAME,
  whatsappOrderReminderEnabled: true,
};

const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings);

function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

function whatsAppUrl(text: string) {
  return `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(text)}`;
}
type OrderStatus = 'Pending' | 'Processing' | 'Delivered' | 'Failed';

const NETWORK_STATES_KEY = 'matornawo_network_states';
const PACKAGES_STORAGE_KEY = 'matornawo_packages';
const DEVELOPER_LINKEDIN_URL = 'https://www.linkedin.com/in/seyramgblorkpor/';

const DEFAULT_NETWORK_STATES: NetworkStates = {
  MTN: 'active',
  AirtelTigo: 'disabled',
  Telecel: 'disabled',
};

const NETWORK_STATE_DESCRIPTIONS: Record<NetworkState, string> = {
  active: 'Network is active — customers can buy packages',
  disabled: "Network is disabled — customers see 'Coming Soon'",
  closed: "Network is closed — customers see 'Store Closed'",
};

function loadNetworkStates(): NetworkStates {
  if (typeof window === 'undefined') return DEFAULT_NETWORK_STATES;
  try {
    const saved = localStorage.getItem(NETWORK_STATES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<NetworkStates>;
      return {
        MTN: parsed.MTN ?? 'active',
        AirtelTigo: parsed.AirtelTigo ?? 'disabled',
        Telecel: parsed.Telecel ?? 'disabled',
      };
    }
    const legacy = localStorage.getItem('networkEnabled');
    if (legacy) {
      const old = JSON.parse(legacy) as { AirtelTigo: boolean; Telecel: boolean };
      return {
        MTN: 'active',
        AirtelTigo: old.AirtelTigo ? 'active' : 'disabled',
        Telecel: old.Telecel ? 'active' : 'disabled',
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_NETWORK_STATES;
}

// PAYSTACK: Only PUBLIC key (pk_...) belongs in frontend code.
// SECRET key (sk_...) must NEVER appear in frontend — backend use only.
// pk_test_... → testing | pk_live_... → production

interface Order {
  orderId: string;
  network: Network;
  package: string;
  price: number;
  serviceFee: number;
  total: number;
  recipientPhone: string;
  email: string;
  status: OrderStatus;
  date: string;
}

type DbOrder = {
  order_id: string;
  network: string;
  package: string;
  price: number | string;
  service_fee: number | string;
  total: number | string;
  recipient_phone: string;
  email: string;
  status: string;
  created_at: string;
};

const ORDERS_API = '/api/orders';
const ADMIN_LOGIN_API = '/api/admin/login';
const ADMIN_LOGOUT_API = '/api/admin/logout';
const ADMIN_SESSION_API = '/api/admin/session';
const ADMIN_TELEGRAM_TEST_API = '/api/admin/telegram-test';
const SETTINGS_API = '/api/settings';

type DbSiteSettings = {
  business_name: string;
  whatsapp_order_reminder_enabled: boolean;
};

function mapDbSiteSettings(row: DbSiteSettings): SiteSettings {
  return {
    businessName: row.business_name,
    whatsappOrderReminderEnabled: Boolean(row.whatsapp_order_reminder_enabled),
  };
}

async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(SETTINGS_API);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return mapDbSiteSettings((await res.json()) as DbSiteSettings);
}

function adminFetch(input: string, init?: RequestInit) {
  return fetch(input, { ...init, credentials: 'include' });
}

function mapDbOrder(row: DbOrder): Order {
  return {
    orderId: row.order_id,
    network: row.network as Network,
    package: row.package,
    price: Number(row.price),
    serviceFee: Number(row.service_fee),
    total: Number(row.total),
    recipientPhone: row.recipient_phone,
    email: row.email,
    status: row.status as OrderStatus,
    date: row.created_at,
  };
}

async function fetchOrders(): Promise<Order[]> {
  const res = await adminFetch(ORDERS_API);
  if (!res.ok) throw new Error('Failed to fetch orders');
  const data = (await res.json()) as DbOrder[];
  return data.map(mapDbOrder);
}

async function fetchOrderById(orderId: string): Promise<Order | null> {
  const res = await fetch(`${ORDERS_API}?order_id=${encodeURIComponent(orderId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch order');
  return mapDbOrder((await res.json()) as DbOrder);
}

async function createOrder(order: Order): Promise<Order> {
  const res = await fetch(ORDERS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: order.orderId,
      network: order.network,
      package: order.package,
      price: order.price,
      service_fee: order.serviceFee,
      total: order.total,
      recipient_phone: order.recipientPhone,
      email: order.email,
    }),
  });
  if (!res.ok) throw new Error('Failed to save order');
  return mapDbOrder((await res.json()) as DbOrder);
}

async function patchOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const res = await adminFetch(ORDERS_API, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, status }),
  });
  if (!res.ok) throw new Error('Failed to update order');
  return mapDbOrder((await res.json()) as DbOrder);
}

function getStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-700';
    case 'Processing':
      return 'bg-blue-100 text-blue-700';
    case 'Delivered':
      return 'bg-green-100 text-green-700';
    case 'Failed':
      return 'bg-red-100 text-red-700';
  }
}

interface Package {
  id: string;
  size: string;
  price: number;
  validity: string;
  network: Network;
}

interface SelectedPackage {
  size: string;
  price: number;
  network: Network;
}

const generateOrderId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ORD-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

type DbPackage = {
  package_id: string;
  network: string;
  size: string;
  validity: string;
  price: number | string;
};

const PACKAGES_API = '/api/packages';
const NOTICES_API = '/api/notices';

interface Notice {
  id: string;
  message: string;
  active: boolean;
  createdAt: string;
}

type DbNotice = {
  notice_id: string;
  message: string;
  active: boolean;
  created_at: string;
};

function mapDbNotice(row: DbNotice): Notice {
  return {
    id: row.notice_id,
    message: row.message,
    active: row.active,
    createdAt: row.created_at,
  };
}

async function fetchActiveNotices(): Promise<Notice[]> {
  const res = await fetch(NOTICES_API);
  if (!res.ok) throw new Error('Failed to fetch notices');
  const data = (await res.json()) as DbNotice[];
  return data.map(mapDbNotice);
}

const PROMO_SLIDES_API = '/api/promo-slides';

interface PromoSlide {
  index: number;
  title: string;
  headline: string;
  backgroundColor: string;
}

type DbPromoSlide = {
  slide_index: number;
  title: string;
  headline: string;
  background_color: string;
};

function mapDbPromoSlide(row: DbPromoSlide): PromoSlide {
  return {
    index: row.slide_index,
    title: row.title,
    headline: row.headline,
    backgroundColor: row.background_color,
  };
}

async function fetchPromoSlides(): Promise<PromoSlide[]> {
  const res = await fetch(PROMO_SLIDES_API);
  if (!res.ok) throw new Error('Failed to fetch promo slides');
  const data = (await res.json()) as DbPromoSlide[];
  return data.map(mapDbPromoSlide);
}

function mapDbPackage(row: DbPackage): Package {
  return {
    id: row.package_id,
    network: row.network as Network,
    size: row.size,
    validity: row.validity,
    price: parseFloat(String(row.price)),
  };
}

function loadCachedPackages(): Package[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Package[];
  } catch {
    // ignore
  }
  return [];
}

function getInitialPage(): Page {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    if (path === '/dev_seyram') {
      return 'admin';
    }
    if (path !== '/' && path !== '') {
      return 'not-found';
    }
  }
  return 'dashboard';
}

// ─── NOTICE TICKER ────────────────────────────────────────────────────────────

function NoticeTicker({ notices }: { notices: Notice[] }) {
  const activeNotices = notices.filter((n) => n.active);
  if (activeNotices.length === 0) return null;

  const line = activeNotices.map((n) => n.message).join('   ◆   ');

  return (
    <div
      className="fixed top-14 left-0 right-0 md:left-[288px] z-20 h-8 flex items-center overflow-hidden border-b border-amber-400/20"
      style={{ backgroundColor: '#1a1a1a' }}
      aria-live="polite"
    >
      <div className="notice-marquee-track text-xs font-medium tracking-wide text-amber-400">
        <span className="px-10">{line}</span>
        <span className="px-10" aria-hidden="true">
          {line}
        </span>
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function Toast({ message, onClose, variant = 'success' }: {
  message: string;
  onClose: () => void;
  variant?: 'success' | 'error' | 'info';
}) {
  const bgColor = variant === 'success' ? 'bg-green-500' : variant === 'error' ? 'bg-red-500' : 'bg-gray-700';
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bgColor} text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3`}>
      {variant === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white text-xs">✕</button>
    </div>
  );
}

// ─── NOT FOUND ────────────────────────────────────────────────────────────────

function NotFound() {
  const { businessName } = useSiteSettings();
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
          <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center shadow-lg">
            <Database className="w-5 h-5 text-gray-900" />
          </div>
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
            onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }}
            className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-900 text-sm shadow-lg hover:shadow-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-200"
            style={{ backgroundColor: '#FFC107' }}
          >
            🏠 Go Home
          </button>

          <button
            onClick={() => window.open(whatsAppUrl(`Hello ${businessName}, I need help.`), '_blank')}
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

// ─── NETWORK TABS ─────────────────────────────────────────────────────────────

function NetworkTabs({ active, onChange }: { active: Network; onChange: (n: Network) => void }) {
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

// ─── COMING SOON ──────────────────────────────────────────────────────────────

function ComingSoon({ network }: { network: Network }) {
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

// ─── STORE CLOSED ─────────────────────────────────────────────────────────────

function StoreClosed({ network }: { network: Network }) {
  const { businessName } = useSiteSettings();
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
              whatsAppUrl(
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

// ─── DATA PACKAGES ────────────────────────────────────────────────────────────

function DataPackages({
  network,
  packages,
  onPackageSelect,
  networkState,
}: {
  network: Network;
  packages: Package[];
  onPackageSelect: (pkg: SelectedPackage) => void;
  networkState: NetworkState;
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
                  className="w-full mt-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-gray-900 font-bold text-sm py-1.5 rounded-lg transition-all duration-150"
                >
                  Buy Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BUY MODAL ────────────────────────────────────────────────────────────────

function BuyModal({
  isOpen,
  onClose,
  selectedPackage,
  onOrderCreated,
  showToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: SelectedPackage | null;
  onOrderCreated: (order: Order) => Promise<void>;
  showToast: (msg: string, variant?: 'success' | 'error' | 'info') => void;
}) {
  const { businessName, whatsappOrderReminderEnabled } = useSiteSettings();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({});
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{ whatsappURL: string } | null>(null);
  const paymentCompletedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      paymentCompletedRef.current = false;
      setOrderComplete(false);
      setPaymentSuccess(null);
      setPhone('');
      setEmail('');
      setErrors({});
      setProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !selectedPackage) return null;

  const price = selectedPackage.price;
  const serviceFee = parseFloat((price * 0.02).toFixed(2));
  const total = parseFloat((price * 1.02).toFixed(2));

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

  const handlePaystackPayment = () => {
    if (!validateForm()) return;

    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    if (!paystackPublicKey || paystackPublicKey.includes('REPLACE')) {
      alert('Payment is not configured. Please contact support.');
      return;
    }
    if (paystackPublicKey.startsWith('sk_')) {
      alert('Payment is not configured. Please contact support.');
      return;
    }

    const orderId = generateOrderId();
    const recipientPhone = phone;
    const network = selectedPackage.network;
    const packageSize = selectedPackage.size;
    const amountInPesewas = Math.round(total * 100);

    if (amountInPesewas < 10) {
      showToast('Minimum payment is GH₵0.10', 'error');
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
        handlePaymentSuccess(response.reference, orderId, network, packageSize, recipientPhone);
      },
      onClose: function () {
        handlePaymentClosed();
      },
    });

    handler.openIframe();
  };

  const handlePaymentSuccess = (
    reference: string,
    orderId: string,
    orderNetwork: Network,
    orderPackageSize: string,
    recipientPhone: string
  ) => {
    setProcessing(false);

    const newOrder: Order = {
      orderId,
      network: orderNetwork,
      package: orderPackageSize,
      price,
      serviceFee,
      total,
      recipientPhone,
      email,
      status: 'Pending',
      date: new Date().toISOString(),
    };

    void onOrderCreated(newOrder);

    showToast(`✅ Payment Successful! Your ${orderPackageSize} bundle is being sent to ${recipientPhone}`, 'success');

    paymentCompletedRef.current = true;
    setOrderComplete(true);

    if (whatsappOrderReminderEnabled) {
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
- Bundle Price: GH₵${price.toFixed(2)}
- Service Fee (2%): GH₵${serviceFee.toFixed(2)}
- Total Paid: GH₵${total.toFixed(2)}

📅 Date: ${orderDate}
🔖 Paystack Ref: ${reference}

_Please send this message as a reminder of your order. Your data bundle will be sent to ${recipientPhone} shortly._

Thank you for choosing ${businessName}! 🙏`;

      const whatsappURL = whatsAppUrl(message);
      setPaymentSuccess({ whatsappURL });

      setTimeout(() => {
        window.open(whatsappURL, '_blank');
      }, 1500);
    } else {
      setPaymentSuccess(null);
    }
  };

  const handlePaymentClosed = () => {
    setProcessing(false);
    if (paymentCompletedRef.current) return;
    showToast('Payment cancelled. Your order was not placed.', 'info');
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
              <span className="font-semibold text-gray-800">GH₵{serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Total:</span>
              <span className="font-extrabold text-amber-500">GH₵{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePaystackPayment}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500 active:scale-95 text-white font-bold py-3 rounded-xl transition-all duration-150 text-sm"
          >
            {processing ? (
              <><Loader className="w-4 h-4 animate-spin" />Processing...</>
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

// ─── PROMO CAROUSEL ───────────────────────────────────────────────────────────

function PromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const sorted = [...slides].sort((a, b) => a.index - b.index);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (sorted.length <= 1) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % sorted.length),
      5000
    );
    return () => window.clearInterval(id);
  }, [sorted.length]);

  if (sorted.length === 0) return null;

  const slide = sorted[active] ?? sorted[0];

  return (
    <div className="mt-2 w-full max-w-lg">
      <div
        className="rounded-2xl px-8 py-4 shadow-xl transition-colors duration-500"
        style={{ backgroundColor: slide.backgroundColor }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-white/85">{slide.title}</p>
        <p className="text-white font-bold text-base mt-1">{slide.headline}</p>
        <div className="flex gap-1.5 mt-3">
          {sorted.map((s, i) => (
            <button
              key={s.index}
              type="button"
              aria-label={`Show promo slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-opacity ${
                i === active ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({
  showToast,
  onPackageSelect,
  packages,
  networkStates,
  promoSlides,
}: {
  showToast: (msg: string, variant?: 'success' | 'error' | 'info') => void;
  onPackageSelect: (pkg: SelectedPackage) => void;
  packages: Package[];
  networkStates: NetworkStates;
  promoSlides: PromoSlide[];
}) {
  const { businessName } = useSiteSettings();
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
                  whatsAppUrl(
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BUY DATA ─────────────────────────────────────────────────────────────────

function BuyData({
  onPackageSelect,
  packages,
  networkStates,
}: {
  onPackageSelect: (pkg: SelectedPackage) => void;
  packages: Package[];
  networkStates: NetworkStates;
}) {
  const [activeNetwork, setActiveNetwork] = useState<Network>('MTN');

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
        />
      </div>
    </div>
  );
}

// ─── TRACK ORDER ──────────────────────────────────────────────────────────────

function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState<Order | 'not-found' | null>(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = () => {
    const key = orderId.trim().toUpperCase();
    if (!key) return;
    setSearched(true);
    void fetchOrderById(key)
      .then((found) => {
        setResult(found ?? 'not-found');
      })
      .catch((err) => {
        console.error('Failed to fetch order for tracking:', err);
        setResult('not-found');
      });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-800">Track Order</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">Enter your order ID to track your purchase</p>

      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input
          type="text"
          value={orderId}
          onChange={(e) => { setOrderId(e.target.value); setSearched(false); setResult(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          placeholder="ENTER ORDER ID (E.G., ORD-ABC12345)"
          className="flex-1 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
        />
        <button
          onClick={handleTrack}
          className="w-full md:w-auto bg-amber-400 hover:bg-amber-300 active:scale-95 text-gray-900 font-bold px-6 py-3 rounded-xl text-sm transition-all duration-150 shadow-sm"
        >
          Track
        </button>
      </div>

      {!searched && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-700 font-bold text-lg">Track Your Order</p>
          <p className="text-gray-400 text-sm text-center max-w-xs">Enter the order ID you received after purchase</p>
        </div>
      )}

      {searched && result === 'not-found' && (
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <Search className="w-7 h-7 text-red-400" />
          </div>
          <p className="font-bold text-gray-700">Order Not Found</p>
          <p className="text-sm text-gray-400 text-center">
            We couldn't find any order matching{' '}
            <span className="font-semibold text-gray-600">"{orderId.trim()}"</span>. Please check the ID and try again.
          </p>
        </div>
      )}

      {searched && result && result !== 'not-found' && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className={`px-6 py-4 flex items-center justify-between ${
            result.status === 'Delivered' ? 'bg-green-500' : result.status === 'Failed' ? 'bg-red-500' : result.status === 'Processing' ? 'bg-blue-600' : 'bg-amber-400'
          }`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">Order Status</p>
              <p className="text-white font-extrabold text-lg mt-0.5">{result.status}</p>
            </div>
            {result.status === 'Delivered' ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <Loader className="w-8 h-8 text-white animate-spin" />
            )}
          </div>
          <div className="px-6 py-5 space-y-0">
            {[
              { label: 'Order ID', value: result.orderId },
              { label: 'Network', value: result.network },
              { label: 'Package', value: result.package },
              { label: 'Price', value: `GH₵${result.price.toFixed(2)}` },
              { label: 'Total', value: `GH₵${result.total.toFixed(2)}` },
              { label: 'Phone', value: result.recipientPhone },
              { label: 'Date', value: new Date(result.date).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra' }) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-400 font-medium">{label}</span>
                <span className="text-sm text-gray-800 font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

function AdminPanel({
  orders,
  onUpdateOrderStatus,
  packages,
  setPackages,
  networkStates,
  setNetworkStates,
  onLogout,
  showToast,
  onNoticesChange,
  promoSlides,
  onPromoSlidesChange,
  siteSettings,
  onSettingsChange,
}: {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  packages: Package[];
  setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
  networkStates: NetworkStates;
  setNetworkStates: React.Dispatch<React.SetStateAction<NetworkStates>>;
  onLogout: () => void;
  showToast: (msg: string, variant?: 'success' | 'error' | 'info') => void;
  onNoticesChange: () => void;
  promoSlides: PromoSlide[];
  onPromoSlidesChange: () => void;
  siteSettings: SiteSettings;
  onSettingsChange: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [settingsDraft, setSettingsDraft] = useState({
    businessName: siteSettings.businessName,
    whatsappOrderReminderEnabled: siteSettings.whatsappOrderReminderEnabled,
  });
  const [adminNotices, setAdminNotices] = useState<Notice[]>([]);
  const [promoDrafts, setPromoDrafts] = useState<PromoSlide[]>([]);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeEditMessage, setNoticeEditMessage] = useState('');
  const [newNoticeMessage, setNewNoticeMessage] = useState('');
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ size: string; validity: string; price: string }>({ size: '', validity: '', price: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [addingPackage, setAddingPackage] = useState(false);
  const [newPackageForm, setNewPackageForm] = useState({ network: 'MTN' as Network, size: '', validity: '', price: '' });

  const loadAdminNotices = () => {
    adminFetch(NOTICES_API)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load notices');
        return res.json() as Promise<DbNotice[]>;
      })
      .then((rows) => setAdminNotices(rows.map(mapDbNotice)))
      .catch((err) => {
        console.error('Failed to load notices:', err);
        showToast('Failed to load notices', 'error');
      });
  };

  useEffect(() => {
    if (activeTab === 'notices') loadAdminNotices();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'promos') {
      const sorted = [...promoSlides].sort((a, b) => a.index - b.index);
      setPromoDrafts(sorted);
    }
  }, [activeTab, promoSlides]);

  useEffect(() => {
    if (activeTab === 'settings') {
      setSettingsDraft({
        businessName: siteSettings.businessName,
        whatsappOrderReminderEnabled: siteSettings.whatsappOrderReminderEnabled,
      });
    }
  }, [activeTab, siteSettings]);

  const saveSiteSettings = () => {
    const businessName = settingsDraft.businessName.trim();
    if (!businessName) {
      showToast('Business name is required', 'error');
      return;
    }
    adminFetch(SETTINGS_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: businessName,
        whatsapp_order_reminder_enabled: settingsDraft.whatsappOrderReminderEnabled,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save settings');
        return res.json() as Promise<DbSiteSettings>;
      })
      .then(() => {
        onSettingsChange();
        showToast('Settings saved', 'success');
      })
      .catch((err) => {
        console.error('Failed to save settings:', err);
        showToast('Failed to save settings', 'error');
      });
  };

  const updatePromoDraft = (index: number, field: 'title' | 'headline' | 'backgroundColor', value: string) => {
    setPromoDrafts((prev) =>
      prev.map((s) => (s.index === index ? { ...s, [field]: value } : s))
    );
  };

  const savePromoSlide = (slide: PromoSlide) => {
    const title = slide.title.trim();
    const headline = slide.headline.trim();
    if (!title || !headline) {
      showToast('Title and headline are required', 'error');
      return;
    }
    adminFetch(PROMO_SLIDES_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide_index: slide.index,
        title,
        headline,
        background_color: slide.backgroundColor,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save promo slide');
        return res.json() as Promise<DbPromoSlide>;
      })
      .then(() => {
        onPromoSlidesChange();
        showToast(`Slide ${slide.index} saved`, 'success');
      })
      .catch((err) => {
        console.error('Failed to save promo slide:', err);
        showToast('Failed to save promo slide', 'error');
      });
  };

  const startEditingNotice = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNoticeEditMessage(notice.message);
    setNoticeError(null);
  };

  const cancelEditingNotice = () => {
    setEditingNoticeId(null);
    setNoticeEditMessage('');
    setNoticeError(null);
  };

  const saveEditingNotice = (id: string) => {
    const message = noticeEditMessage.trim();
    if (!message) {
      setNoticeError('Message is required');
      return;
    }
    adminFetch(NOTICES_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice_id: id, message }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update notice');
        return res.json() as Promise<DbNotice>;
      })
      .then((row) => {
        setAdminNotices((prev) => prev.map((n) => (n.id === id ? mapDbNotice(row) : n)));
        setEditingNoticeId(null);
        setNoticeError(null);
        onNoticesChange();
        showToast('Notice updated', 'success');
      })
      .catch((err) => {
        console.error('Failed to update notice:', err);
        showToast('Failed to update notice', 'error');
      });
  };

  const toggleNoticeActive = (id: string, active: boolean) => {
    adminFetch(NOTICES_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice_id: id, active }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update notice');
        return res.json() as Promise<DbNotice>;
      })
      .then((row) => {
        setAdminNotices((prev) => prev.map((n) => (n.id === id ? mapDbNotice(row) : n)));
        onNoticesChange();
        showToast(active ? 'Notice is now visible' : 'Notice hidden', 'success');
      })
      .catch((err) => {
        console.error('Failed to toggle notice:', err);
        showToast('Failed to update notice', 'error');
      });
  };

  const handleDeleteNotice = (id: string) => {
    if (!confirm('Delete this notice?')) return;
    adminFetch(NOTICES_API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice_id: id }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete notice');
        setAdminNotices((prev) => prev.filter((n) => n.id !== id));
        onNoticesChange();
        showToast('Notice deleted', 'success');
      })
      .catch((err) => {
        console.error('Failed to delete notice:', err);
        showToast('Failed to delete notice', 'error');
      });
  };

  const handleAddNotice = () => {
    const message = newNoticeMessage.trim();
    if (!message) {
      showToast('Enter a notice message', 'error');
      return;
    }
    adminFetch(NOTICES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create notice');
        return res.json() as Promise<DbNotice>;
      })
      .then((row) => {
        setAdminNotices((prev) => [mapDbNotice(row), ...prev]);
        setNewNoticeMessage('');
        onNoticesChange();
        showToast('Notice published', 'success');
      })
      .catch((err) => {
        console.error('Failed to create notice:', err);
        showToast('Failed to create notice', 'error');
      });
  };

  const startEditing = (pkg: Package) => {
    setEditingId(pkg.id);
    setEditForm({ size: pkg.size, validity: pkg.validity, price: String(pkg.price) });
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEditing = (id: string) => {
    const size = editForm.size.trim();
    const validity = editForm.validity.trim();
    const price = parseFloat(editForm.price);
    if (!size) { setEditError('Size is required'); return; }
    if (!validity) { setEditError('Validity is required'); return; }
    if (isNaN(price) || price <= 0) { setEditError('Price must be a number greater than 0'); return; }
    adminFetch(PACKAGES_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: id, size, validity, price }),
    })
      .then((res) => res.json())
      .then(() => {
        setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, size, validity, price } : p)));
        setEditingId(null);
        setEditError(null);
        showToast('Package updated successfully', 'success');
      })
      .catch((err) => {
        console.error('Failed to update package:', err);
        showToast('Failed to update package', 'error');
      });
  };

  const filteredOrders = orders.filter(
    (o) => o.orderId.includes(searchQuery.toUpperCase()) || o.recipientPhone.includes(searchQuery)
  );
  const totalRevenue = orders.filter((o) => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0);

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    void onUpdateOrderStatus(orderId, status);
  };

  const handleDeletePackage = (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    adminFetch(PACKAGES_API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: id }),
    })
      .then(() => {
        setPackages((prev) => prev.filter((p) => p.id !== id));
        showToast('Package deleted', 'success');
      })
      .catch((err) => {
        console.error('Failed to delete package:', err);
        showToast('Failed to delete package', 'error');
      });
  };

  const handleAddPackage = () => {
    if (!newPackageForm.size || !newPackageForm.validity || !newPackageForm.price) {
      showToast('Please fill all fields', 'error');
      return;
    }
    const network = newPackageForm.network as Network;
    const size = newPackageForm.size;
    const validity = newPackageForm.validity;
    const price = parseFloat(newPackageForm.price);
    adminFetch(PACKAGES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package_id: network.toLowerCase() + '-' + size.toLowerCase().replace(' ', ''),
        network,
        size,
        validity,
        price,
      }),
    })
      .then((res) => res.json())
      .then((newPkg: DbPackage) => {
        setPackages((prev) => [...prev, mapDbPackage(newPkg)]);
        setNewPackageForm({ network: 'MTN', size: '', validity: '', price: '' });
        setAddingPackage(false);
        showToast('Package added successfully', 'success');
      })
      .catch((err) => {
        console.error('Failed to add package:', err);
        showToast('Failed to add package', 'error');
      });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-3xl font-extrabold text-gray-800">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              adminFetch(ADMIN_TELEGRAM_TEST_API, { method: 'POST' })
                .then(async (res) => {
                  const data = (await res.json()) as { ok?: boolean; error?: string };
                  if (res.ok && data.ok) {
                    showToast('Test Telegram sent — check your phone', 'success');
                  } else {
                    showToast(data.error || 'Telegram test failed', 'error');
                  }
                })
                .catch(() => showToast('Telegram test failed', 'error'));
            }}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Test Telegram
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {(['orders', 'packages', 'networks', 'notices', 'promos', 'settings'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab ? 'border-amber-400 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or phone..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Orders', value: orders.length },
              { label: 'Processing', value: orders.filter((o) => o.status === 'Processing').length },
              { label: 'Total Revenue', value: `GH₵${totalRevenue.toFixed(2)}` },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-400">
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Order ID', 'Network', 'Package', 'Phone', 'Total', 'Date', 'Status'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No orders yet</td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-800">{order.orderId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{order.network}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{order.package}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{order.recipientPhone}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">GH₵{order.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(order.date).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra' })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.orderId, e.target.value as OrderStatus)}
                            className="text-sm rounded-lg px-2 py-1 border border-gray-300 bg-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Failed">Failed</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PACKAGES TAB */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <button
            onClick={() => setAddingPackage(!addingPackage)}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Package
          </button>

          {addingPackage && (
            <div className="bg-white rounded-lg shadow p-4 border border-amber-200 space-y-3">
              <select
                value={newPackageForm.network}
                onChange={(e) => setNewPackageForm({ ...newPackageForm, network: e.target.value as Network })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="MTN">MTN</option>
                <option value="AirtelTigo">AirtelTigo</option>
                <option value="Telecel">Telecel</option>
              </select>
              <input type="text" placeholder="Size (e.g., 1GB)" value={newPackageForm.size}
                onChange={(e) => setNewPackageForm({ ...newPackageForm, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <input type="text" placeholder="Validity (e.g., Non Expiry)" value={newPackageForm.validity}
                onChange={(e) => setNewPackageForm({ ...newPackageForm, validity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <input type="number" placeholder="Price (GHS)" value={newPackageForm.price}
                onChange={(e) => setNewPackageForm({ ...newPackageForm, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <div className="flex gap-2">
                <button onClick={handleAddPackage} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg">Save</button>
                <button onClick={() => setAddingPackage(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          {(['MTN', 'AirtelTigo', 'Telecel'] as Network[]).map((network) => {
            const networkPkgs = packages.filter((p) => p.network === network);
            return (
              <div key={network} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800">{network} Packages</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Network', 'Size', 'Validity', 'Price', 'Actions'].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {networkPkgs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No packages. Add one above.</td>
                      </tr>
                    ) : (
                      networkPkgs.map((pkg) => {
                        const isEditing = editingId === pkg.id;
                        return (
                          <tr key={pkg.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{pkg.network}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {isEditing ? (
                                <input type="text" value={editForm.size}
                                  onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              ) : pkg.size}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {isEditing ? (
                                <input type="text" value={editForm.validity}
                                  onChange={(e) => setEditForm({ ...editForm, validity: e.target.value })}
                                  className="w-32 px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              ) : pkg.validity}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                              {isEditing ? (
                                <input type="number" step="0.01" min="0.10" value={editForm.price}
                                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              ) : `GH₵${pkg.price.toFixed(2)}`}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isEditing ? (
                                  <>
                                    <button onClick={() => saveEditing(pkg.id)}
                                      className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-3 py-1 rounded">
                                      Save
                                    </button>
                                    <button onClick={cancelEditing}
                                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded">
                                      Cancel
                                    </button>
                                    {editError && <span className="text-xs text-red-500">{editError}</span>}
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEditing(pkg)}
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold">
                                      <Edit2 className="w-3 h-3" />Edit
                                    </button>
                                    <button onClick={() => handleDeletePackage(pkg.id)}
                                      className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold">
                                      <Trash2 className="w-3 h-3" />Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* NETWORKS TAB */}
      {activeTab === 'networks' && (
        <div className="space-y-4">
          {(['MTN', 'AirtelTigo', 'Telecel'] as Network[]).map((network) => (
            <div key={network} className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800">{network}</h3>
                <p className="text-sm text-gray-600">{NETWORK_STATE_DESCRIPTIONS[networkStates[network]]}</p>
              </div>
              <select
                value={networkStates[network]}
                onChange={(e) => setNetworkStates((prev) => ({ ...prev, [network]: e.target.value as NetworkState }))}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-semibold text-gray-800 shrink-0"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-gray-800">Business name</h3>
            </div>
            <p className="text-xs text-gray-500">
              Shown across the site: header, sidebar, order messages, and admin login.
            </p>
            <input
              type="text"
              value={settingsDraft.businessName}
              onChange={(e) =>
                setSettingsDraft((prev) => ({ ...prev, businessName: e.target.value }))
              }
              maxLength={80}
              placeholder="e.g. MATOE CONNECT"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-bold text-gray-800">WhatsApp order reminder</h3>
            <p className="text-xs text-gray-500">
              When enabled, customers are prompted to send an order confirmation on WhatsApp after payment.
            </p>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                {settingsDraft.whatsappOrderReminderEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settingsDraft.whatsappOrderReminderEnabled}
                onClick={() =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    whatsappOrderReminderEnabled: !prev.whatsappOrderReminderEnabled,
                  }))
                }
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settingsDraft.whatsappOrderReminderEnabled ? 'bg-amber-400' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settingsDraft.whatsappOrderReminderEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>

          <button
            type="button"
            onClick={saveSiteSettings}
            className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-6 py-2.5 rounded-lg text-sm"
          >
            Save settings
          </button>
        </div>
      )}

      {/* PROMOS TAB */}
      {activeTab === 'promos' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Edit the three rotating banners on the dashboard hero. Each slide has its own text and background colour.
          </p>
          {promoDrafts.map((slide) => (
            <div key={slide.index} className="bg-white rounded-lg shadow p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-gray-800">Slide {slide.index}</h3>
                <div
                  className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm"
                  style={{ backgroundColor: slide.backgroundColor }}
                >
                  Preview
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Small label</label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => updatePromoDraft(slide.index, 'title', e.target.value)}
                  maxLength={80}
                  placeholder="e.g. TELECEL PROMO"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Main text</label>
                <input
                  type="text"
                  value={slide.headline}
                  onChange={(e) => updatePromoDraft(slide.index, 'headline', e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Fast & Reliable Data Plans"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Background colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={slide.backgroundColor}
                    onChange={(e) => updatePromoDraft(slide.index, 'backgroundColor', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={slide.backgroundColor}
                    onChange={(e) => updatePromoDraft(slide.index, 'backgroundColor', e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => savePromoSlide(slide)}
                className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm"
              >
                Save slide {slide.index}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* NOTICES TAB */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-gray-800">New notice</h3>
            </div>
            <p className="text-xs text-gray-500">
              Active notices scroll left to right on the customer header bar.
            </p>
            <textarea
              value={newNoticeMessage}
              onChange={(e) => setNewNoticeMessage(e.target.value)}
              placeholder="e.g. MTN bundles restocked — order now!"
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <button
              onClick={handleAddNotice}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Publish notice
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminNotices.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No notices yet. Add one above.
                    </td>
                  </tr>
                ) : (
                  adminNotices.map((notice) => {
                    const isEditing = editingNoticeId === notice.id;
                    return (
                      <tr key={notice.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 align-top">
                          {isEditing ? (
                            <div className="space-y-1">
                              <textarea
                                value={noticeEditMessage}
                                onChange={(e) => setNoticeEditMessage(e.target.value)}
                                maxLength={500}
                                rows={2}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                              />
                              {noticeError && <p className="text-xs text-red-500">{noticeError}</p>}
                            </div>
                          ) : (
                            notice.message
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
                          <button
                            type="button"
                            onClick={() => toggleNoticeActive(notice.id, !notice.active)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              notice.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {notice.active ? 'Visible' : 'Hidden'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditingNotice(notice.id)}
                                  className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-3 py-1 rounded text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditingNotice}
                                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded text-xs"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingNotice(notice)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteNotice(notice.id)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold text-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void; showToast?: (msg: string, variant?: 'success' | 'error' | 'info') => void }) {
  const { businessName } = useSiteSettings();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = () => {
    if (!password || submitting) return;
    setSubmitting(true);
    setError('');
    void adminFetch(ADMIN_LOGIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
      .then((res) => {
        if (!res.ok) {
          setError('Incorrect password. Access denied.');
          setPassword('');
          return;
        }
        onLogin();
        setPassword('');
      })
      .catch(() => {
        setError('Unable to sign in. Try again later.');
        setPassword('');
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-amber-400 flex items-center justify-center mx-auto mb-3">
            <Database className="w-6 h-6 text-gray-900" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">{businessName}</h1>
          <p className="text-gray-600 text-sm mt-1">Admin Portal</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
          <button
            onClick={handleLogin}
            disabled={submitting}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<Page>(getInitialPage);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const packagesHydratedRef = useRef(false);
  const [networkStates, setNetworkStates] = useState<NetworkStates>(loadNetworkStates);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [promoSlides, setPromoSlides] = useState<PromoSlide[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const hasActiveNotices = notices.some((n) => n.active);

  const wrapWithSettings = (content: React.ReactNode) => (
    <SiteSettingsContext.Provider value={siteSettings}>{content}</SiteSettingsContext.Provider>
  );

  const refreshSiteSettings = () => {
    fetchSiteSettings()
      .then(setSiteSettings)
      .catch((err) => console.error('Failed to load site settings:', err));
  };

  const refreshCustomerNotices = () => {
    fetchActiveNotices()
      .then(setNotices)
      .catch((err) => console.error('Failed to load notices:', err));
  };

  const refreshPromoSlides = () => {
    fetchPromoSlides()
      .then(setPromoSlides)
      .catch((err) => console.error('Failed to load promo slides:', err));
  };

  useEffect(() => {
    localStorage.setItem(NETWORK_STATES_KEY, JSON.stringify(networkStates));
  }, [networkStates]);

  useEffect(() => {
    refreshCustomerNotices();
    refreshPromoSlides();
    refreshSiteSettings();
  }, []);

  useEffect(() => {
    document.title = `${siteSettings.businessName} — Affordable Data Bundles in Ghana`;
  }, [siteSettings.businessName]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NETWORK_STATES_KEY && e.newValue) {
        try { setNetworkStates(JSON.parse(e.newValue) as NetworkStates); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    fetch(PACKAGES_API)
      .then((res) => res.json())
      .then((data: DbPackage[]) => {
        packagesHydratedRef.current = true;
        if (Array.isArray(data)) {
          setPackages(data.map(mapDbPackage));
        }
      })
      .catch((err) => {
        console.error('Failed to load packages from database:', err);
        packagesHydratedRef.current = true;
        setPackages(loadCachedPackages());
      });
  }, []);

  useEffect(() => {
    if (!packagesHydratedRef.current) return;
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
    const onPop = () => setActivePage(getInitialPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (activePage !== 'admin') return;
    setAdminAuthChecked(false);
    adminFetch(ADMIN_SESSION_API)
      .then((res) => setAdminLoggedIn(res.ok))
      .catch(() => setAdminLoggedIn(false))
      .finally(() => setAdminAuthChecked(true));
  }, [activePage]);

  useEffect(() => {
    if (!adminLoggedIn) {
      setOrders([]);
      return;
    }
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [adminLoggedIn]);

  const handleOrderCreated = async (order: Order) => {
    try {
      const saved = await createOrder(order);
      console.log('Order saved to database:', saved);
      setOrders((prev) => [...prev, saved]);
    } catch (err) {
      console.error('Failed to save order to database:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status } : o)));
    try {
      await patchOrderStatus(orderId, status);
      showToast(`Order ${orderId} updated to ${status}`, 'success');
    } catch {
      showToast(`Failed to sync order ${orderId} status`, 'error');
    }
  };

  const showToast = (msg: string, variant: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message: msg, variant });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePackageSelect = (pkg: SelectedPackage) => {
    setSelectedPackage(pkg);
    setShowModal(true);
  };

  const handleAdminLogout = () => {
    void adminFetch(ADMIN_LOGOUT_API, { method: 'POST' }).finally(() => {
      setAdminLoggedIn(false);
      setOrders([]);
      setActivePage('dashboard');
      window.history.pushState({}, '', '/');
    });
  };

  const navItems: { id: Exclude<Page, 'admin' | 'not-found'>; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'buy-data', label: 'Buy Data', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'track-order', label: 'Track Order', icon: <Search className="w-4 h-4" /> },
  ];

  // ── Special pages ──
  if (activePage === 'not-found') return wrapWithSettings(<NotFound />);

  if (activePage === 'admin') {
    if (!adminAuthChecked) {
      return wrapWithSettings(
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <Loader className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      );
    }
    if (!adminLoggedIn) {
      return wrapWithSettings(<AdminLogin onLogin={() => setAdminLoggedIn(true)} />);
    }
    return wrapWithSettings(
      <AdminPanel
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        packages={packages}
        setPackages={setPackages}
        networkStates={networkStates}
        setNetworkStates={setNetworkStates}
        onLogout={handleAdminLogout}
        showToast={showToast}
        onNoticesChange={refreshCustomerNotices}
        promoSlides={promoSlides}
        onPromoSlidesChange={refreshPromoSlides}
        siteSettings={siteSettings}
        onSettingsChange={refreshSiteSettings}
      />
    );
  }

  // ── Main app ──
  return wrapWithSettings(
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: '#f3f3f0' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full flex flex-col z-30 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ width: '288px', backgroundColor: '#111111' }}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Database className="w-4 h-4 text-gray-900" />
          </div>
          <span className="text-white font-bold text-sm leading-tight">{siteSettings.businessName}</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activePage === item.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {item.icon}
              {item.label}
              {activePage === item.id && <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-6 border-t border-gray-800 pt-4 space-y-3">
          <button
            onClick={() => showToast('Agent registration is coming soon!', 'info')}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-gray-900 font-bold py-3 rounded-full text-sm transition-all duration-150"
          >
            <UserPlus className="w-4 h-4" />
            Become an Agent
          </button>
          <a
            href={DEVELOPER_LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0A66C2' }}
          >
            <Linkedin className="w-4 h-4" />
            Contact developer on LinkedIn
          </a>
        </div>
      </aside>

      <header
        className="fixed top-0 left-0 right-0 md:left-[288px] h-14 flex items-center justify-between px-4 md:px-6 z-20 border-b border-gray-800"
        style={{ backgroundColor: '#111111' }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-300 hover:text-white p-1 -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-gray-900" />
          </div>
          <span className="text-white font-bold text-sm">{siteSettings.businessName}</span>
        </div>
        <button className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
          <User className="w-4 h-4 text-gray-300" />
        </button>
      </header>

      <NoticeTicker notices={notices} />

      <main
        className={`min-h-screen ml-0 md:ml-[288px] ${hasActiveNotices ? 'pt-[5.5rem]' : 'pt-14'}`}
        style={{ backgroundColor: '#f3f3f0' }}
      >
        {activePage === 'dashboard' && (
          <Dashboard
            showToast={showToast}
            onPackageSelect={handlePackageSelect}
            packages={packages}
            networkStates={networkStates}
            promoSlides={promoSlides}
          />
        )}
        {activePage === 'buy-data' && (
          <BuyData onPackageSelect={handlePackageSelect} packages={packages} networkStates={networkStates} />
        )}
        {activePage === 'track-order' && <TrackOrder />}
      </main>

      <BuyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedPackage={selectedPackage}
        onOrderCreated={handleOrderCreated}
        showToast={showToast}
      />

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} variant={toast.variant} />}
      <Analytics />
    </div>
  );
}
