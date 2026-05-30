import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { LayoutDashboard, ShoppingCart, Search, UserPlus, Clock, Wifi, Users, Rocket, User, ChevronRight, CheckCircle, Loader, X, CreditCard, LogOut, CreditCard as Edit2, Trash2, Plus, MessageCircle, Menu, Lock, Megaphone, Linkedin, Settings, AlertTriangle, Info } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
  networkStates: NetworkStates;
}

const DEFAULT_BUSINESS_NAME = 'MATOE CONNECT';
const WHATSAPP_SUPPORT_NUMBER = '233534764068';
const ADMIN_PATH = (
  (import.meta.env.VITE_ADMIN_PATH as string | undefined) || '/dev_seyram'
).replace(/\/+$/, '').toLowerCase();

const DEFAULT_NETWORK_STATES: NetworkStates = {
  MTN: 'active',
  AirtelTigo: 'disabled',
  Telecel: 'disabled',
};

const defaultSiteSettings: SiteSettings = {
  businessName: DEFAULT_BUSINESS_NAME,
  whatsappOrderReminderEnabled: true,
  networkStates: DEFAULT_NETWORK_STATES,
};

const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings);

function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

function BrandLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/favicon.png"
      alt=""
      className={`${className} rounded-lg object-contain flex-shrink-0`}
    />
  );
}

function whatsAppUrl(text: string) {
  return `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(text)}`;
}
type OrderStatus = 'Pending' | 'Processing' | 'Delivered' | 'Failed';

const PACKAGES_STORAGE_KEY = 'matornawo_packages';
const DEVELOPER_LINKEDIN_URL = 'https://www.linkedin.com/in/seyramgblorkpor/';

const NETWORK_STATE_DESCRIPTIONS: Record<NetworkState, string> = {
  active: 'Network is active — customers can buy packages',
  disabled: "Network is disabled — customers see 'Coming Soon'",
  closed: "Network is closed — customers see 'Store Closed'",
};

function mapNetworkStates(raw: unknown): NetworkStates {
  const states = raw as Partial<NetworkStates> | undefined;
  return {
    MTN: states?.MTN ?? 'active',
    AirtelTigo: states?.AirtelTigo ?? 'disabled',
    Telecel: states?.Telecel ?? 'disabled',
  };
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
const PAYSTACK_VERIFY_API = '/api/paystack/verify';
const ADMIN_LOGIN_API = '/api/admin/login';
const ADMIN_LOGOUT_API = '/api/admin/logout';
const ADMIN_SESSION_API = '/api/admin/session';
const ADMIN_TELEGRAM_TEST_API = '/api/admin/telegram-test';
const ADMIN_INTEGRATIONS_API = '/api/admin/integrations';
const SETTINGS_API = '/api/settings';

type DbSiteSettings = {
  business_name: string;
  whatsapp_order_reminder_enabled: boolean;
  network_states?: Partial<NetworkStates>;
};

function mapDbSiteSettings(row: DbSiteSettings): SiteSettings {
  return {
    businessName: row.business_name,
    whatsappOrderReminderEnabled: Boolean(row.whatsapp_order_reminder_enabled),
    networkStates: mapNetworkStates(row.network_states),
  };
}

type TrackedOrder = Pick<Order, 'orderId' | 'network' | 'package' | 'status' | 'date' | 'recipientPhone'>;

type PublicDbOrder = {
  order_id: string;
  network: string;
  package: string;
  status: string;
  created_at: string;
  recipient_phone: string;
};

function mapPublicOrder(row: PublicDbOrder): TrackedOrder {
  return {
    orderId: row.order_id,
    network: row.network as Network,
    package: row.package,
    status: row.status as OrderStatus,
    date: row.created_at,
    recipientPhone: row.recipient_phone,
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

async function fetchOrderById(orderId: string): Promise<TrackedOrder | null> {
  const params = new URLSearchParams({ order_id: orderId });
  const res = await fetch(`${ORDERS_API}?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch order');
  return mapPublicOrder((await res.json()) as PublicDbOrder);
}

async function fetchOrdersByPhone(phone: string): Promise<TrackedOrder[]> {
  const params = new URLSearchParams({ phone });
  const res = await fetch(`${ORDERS_API}?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  const data = (await res.json()) as PublicDbOrder[];
  return Array.isArray(data) ? data.map(mapPublicOrder) : [];
}

function formatPaymentVerifyError(serverMsg: string): string {
  const m = serverMsg.toLowerCase();
  if (
    m.includes('invalid key') ||
    m.includes('could not be confirmed') ||
    m.includes('temporarily unavailable')
  ) {
    return (
      'Your payment may have succeeded but we could not confirm it yet. ' +
      'Contact support with your Order ID — an admin will complete your order.'
    );
  }
  if (m.includes('amount mismatch')) {
    return 'Payment amount did not match the package price. Contact support with your Order ID.';
  }
  return serverMsg;
}

async function verifyPayment(params: {
  reference: string;
  orderId: string;
  network: Network;
  package: string;
  recipientPhone: string;
  email: string;
}): Promise<void> {
  const res = await fetch(PAYSTACK_VERIFY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: params.reference,
      order_id: params.orderId,
      network: params.network,
      package: params.package,
      recipient_phone: params.recipientPhone,
      email: params.email,
    }),
  });
  if (!res.ok) {
    let serverMsg = 'Failed to verify payment';
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) serverMsg = errBody.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(formatPaymentVerifyError(serverMsg));
  }
}

type IntegrationStatus = {
  paystack: {
    configured: boolean;
    valid: boolean;
    mode: 'live' | 'test' | null;
    reason: string | null;
  };
  telegram: { configured: boolean; reason: string | null };
  ready: boolean;
};

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

function packageKey(pkg: { network: Network; size: string }) {
  return `${pkg.network}|${pkg.size}`;
}

function packagesHaveMismatch(current: Package[], fresh: Package[]): boolean {
  const freshPrices = new Map(fresh.map((p) => [packageKey(p), p.price]));
  for (const pkg of current) {
    const dbPrice = freshPrices.get(packageKey(pkg));
    if (dbPrice === undefined || Math.abs(pkg.price - dbPrice) > 0.001) {
      return true;
    }
  }
  return false;
}

async function fetchFreshPackages(): Promise<Package[]> {
  const res = await fetch(PACKAGES_API);
  if (!res.ok) throw new Error('Failed to fetch packages');
  const data = (await res.json()) as DbPackage[];
  return Array.isArray(data) ? data.map(mapDbPackage) : [];
}

function getInitialPage(): Page {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    if (path === ADMIN_PATH) {
      return 'admin';
    }
    if (path !== '/' && path !== '') {
      return 'not-found';
    }
  }
  return 'dashboard';
}

function getAppRoute(page: Page): string {
  if (typeof window !== 'undefined' && page === 'not-found') {
    return window.location.pathname;
  }
  if (page === 'admin') return ADMIN_PATH;
  if (page === 'dashboard') return '/';
  return `/${page}`;
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

// ─── TOP NOTIFICATION CARD ───────────────────────────────────────────────────

type TopNotificationVariant = 'error' | 'success' | 'info';

function TopNotificationCard({
  title,
  description,
  variant = 'error',
  durationMs = 30000,
  onDismiss,
  topOffsetClass,
  layout = 'customer',
}: {
  title: string;
  description: string;
  variant?: TopNotificationVariant;
  durationMs?: number;
  onDismiss: () => void;
  topOffsetClass: string;
  layout?: 'customer' | 'admin';
}) {
  const [progress, setProgress] = useState(100);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (elapsed >= durationMs) {
        onDismissRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [durationMs]);

  const styles =
    variant === 'error'
      ? {
          border: 'border-red-500',
          title: 'text-red-700',
          progress: 'bg-red-500',
          iconWrap: 'bg-red-50',
        }
      : variant === 'success'
        ? {
            border: 'border-green-500',
            title: 'text-green-700',
            progress: 'bg-green-500',
            iconWrap: 'bg-green-50',
          }
        : {
            border: 'border-blue-500',
            title: 'text-blue-700',
            progress: 'bg-blue-500',
            iconWrap: 'bg-blue-50',
          };

  const positionClass =
    layout === 'admin' ? 'fixed left-0 right-0 z-[60]' : 'fixed left-0 right-0 md:left-[288px] z-[60]';

  return (
    <div className={`${positionClass} px-4 pointer-events-none ${topOffsetClass}`} role="alert">
      <div
        className={`top-notification-slide-in relative pointer-events-auto max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${styles.border} border-l-4`}
      >
        <div className="flex gap-3 p-4 pb-5 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.iconWrap}`}>
            {variant === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : variant === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Info className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className={`font-bold text-sm ${styles.title}`}>{title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-snug">{description}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className={`h-full transition-[width] duration-75 ease-linear ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
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
          <BrandLogo className="w-10 h-10 shadow-lg" />
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

// ─── BUY MODAL ────────────────────────────────────────────────────────────────

function BuyModal({
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
  const { businessName, whatsappOrderReminderEnabled } = useSiteSettings();
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
    }
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

      setPaymentSuccess({ whatsappURL: whatsAppUrl(message) });
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
  priceSyncing,
}: {
  showToast: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void;
  onPackageSelect: (pkg: SelectedPackage) => void;
  packages: Package[];
  networkStates: NetworkStates;
  promoSlides: PromoSlide[];
  priceSyncing: boolean;
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
              buyDisabled={priceSyncing}
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

// ─── TRACK ORDER ──────────────────────────────────────────────────────────────

type TrackMode = 'orderId' | 'phone';

function OrderResultCard({ order }: { order: TrackedOrder }) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className={`px-6 py-4 flex items-center justify-between ${
        order.status === 'Delivered' ? 'bg-green-500' : order.status === 'Failed' ? 'bg-red-500' : order.status === 'Processing' ? 'bg-blue-600' : 'bg-amber-400'
      }`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Order Status</p>
          <p className="text-white font-extrabold text-lg mt-0.5">{order.status}</p>
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
          { label: 'Date', value: new Date(order.date).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra' }) },
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

function TrackOrder() {
  const [mode, setMode] = useState<TrackMode>('orderId');
  const [query, setQuery] = useState('');
  const [singleResult, setSingleResult] = useState<TrackedOrder | null>(null);
  const [listResult, setListResult] = useState<TrackedOrder[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const isValid =
    mode === 'orderId'
      ? /^ORD-[A-Z0-9]{8}$/i.test(trimmed)
      : /^0\d{9}$/.test(trimmed);

  const resetResults = () => {
    setSearched(false);
    setSingleResult(null);
    setListResult(null);
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

    if (mode === 'orderId') {
      void fetchOrderById(trimmed.toUpperCase())
        .then((found) => setSingleResult(found))
        .catch(() => setSingleResult(null))
        .finally(() => setLoading(false));
      return;
    }

    void fetchOrdersByPhone(trimmed)
      .then((orders) => setListResult(orders))
      .catch(() => setListResult([]))
      .finally(() => setLoading(false));
  };

  const notFound =
    searched &&
    !loading &&
    (mode === 'orderId' ? singleResult === null : (listResult?.length ?? 0) === 0);

  const hasSingleResult = searched && !loading && singleResult !== null;
  const hasListResults = searched && !loading && (listResult?.length ?? 0) > 0;

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

      {hasSingleResult && singleResult && (
        <OrderResultCard order={singleResult} />
      )}

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
  showToast: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void;
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
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [whatsappToggleSaving, setWhatsappToggleSaving] = useState(false);
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
      setIntegrationsLoading(true);
      adminFetch(ADMIN_INTEGRATIONS_API)
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load integration status');
          return res.json() as Promise<IntegrationStatus>;
        })
        .then(setIntegrations)
        .catch((err) => {
          console.error('Failed to load integrations:', err);
          setIntegrations(null);
        })
        .finally(() => setIntegrationsLoading(false));
    }
  }, [activeTab, siteSettings]);

  const paystackPublicMode = (() => {
    const pk = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? '';
    if (pk.startsWith('pk_live_')) return 'live';
    if (pk.startsWith('pk_test_')) return 'test';
    return null;
  })();

  const toggleWhatsappOrderReminder = () => {
    if (whatsappToggleSaving) return;
    const next = !settingsDraft.whatsappOrderReminderEnabled;
    setSettingsDraft((prev) => ({ ...prev, whatsappOrderReminderEnabled: next }));
    setWhatsappToggleSaving(true);
    adminFetch(SETTINGS_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp_order_reminder_enabled: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update WhatsApp setting');
        return res.json() as Promise<DbSiteSettings>;
      })
      .then(() => {
        onSettingsChange();
        showToast(
          next ? 'WhatsApp order reminder enabled' : 'WhatsApp order reminder disabled',
          'success'
        );
      })
      .catch((err) => {
        console.error('Failed to update WhatsApp setting:', err);
        setSettingsDraft((prev) => ({ ...prev, whatsappOrderReminderEnabled: !next }));
        showToast('Failed to update WhatsApp setting', 'error');
      })
      .finally(() => setWhatsappToggleSaving(false));
  };

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
                aria-label={`${network} availability`}
                onChange={(e) => {
                  const value = e.target.value as NetworkState;
                  setNetworkStates((prev) => {
                    const next = { ...prev, [network]: value };
                    adminFetch(SETTINGS_API, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ network_states: next }),
                    })
                      .then((res) => {
                        if (!res.ok) throw new Error('Failed to save network states');
                        onSettingsChange();
                        showToast('Network settings saved', 'success');
                      })
                      .catch(() => showToast('Failed to save network settings', 'error'));
                    return next;
                  });
                }}
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
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <h3 className="font-bold text-gray-800">WhatsApp order reminder</h3>
            </div>
            <p className="text-xs text-gray-500">
              When enabled, customers see a button after payment to send their order confirmation on WhatsApp.
              Changes save immediately.
            </p>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                {settingsDraft.whatsappOrderReminderEnabled ? 'Enabled' : 'Disabled'}
                {whatsappToggleSaving ? ' (saving…)' : ''}
              </span>
              <button
                type="button"
                role="switch"
                aria-label="Toggle WhatsApp order reminder"
                aria-checked={settingsDraft.whatsappOrderReminderEnabled}
                disabled={whatsappToggleSaving}
                onClick={toggleWhatsappOrderReminder}
                className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
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

          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-bold text-gray-800">Payments &amp; alerts (Vercel)</h3>
            <p className="text-xs text-gray-500">
              Orders and Telegram only work when Paystack secret + Telegram env vars are set correctly on Vercel.
            </p>
            {integrationsLoading && (
              <p className="text-sm text-gray-400">Checking configuration…</p>
            )}
            {!integrationsLoading && integrations && (
              <ul className="text-sm space-y-2">
                <li className={integrations.paystack.valid ? 'text-green-700' : 'text-red-600'}>
                  Paystack secret:{' '}
                  {integrations.paystack.valid
                    ? `OK (${integrations.paystack.mode})`
                    : integrations.paystack.reason ?? 'Invalid'}
                </li>
                {paystackPublicMode && integrations.paystack.mode && paystackPublicMode !== integrations.paystack.mode && (
                  <li className="text-red-600 font-medium">
                    Mismatch: site uses {paystackPublicMode} public key but server secret is {integrations.paystack.mode}. Use matching pk_ and sk_ keys (both live on matoe.store).
                  </li>
                )}
                <li className={integrations.telegram.configured ? 'text-green-700' : 'text-red-600'}>
                  Telegram:{' '}
                  {integrations.telegram.configured
                    ? 'OK'
                    : integrations.telegram.reason ?? 'Not configured'}
                </li>
              </ul>
            )}
            {!integrationsLoading && !integrations && (
              <p className="text-sm text-red-600">Could not load status. Log in again or refresh.</p>
            )}
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

function AdminLogin({ onLogin }: { onLogin: () => void; showToast?: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void }) {
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
          <BrandLogo className="w-12 h-12 mx-auto mb-3" />
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
  const [topNotification, setTopNotification] = useState<{
    id: number;
    title: string;
    description: string;
    variant: TopNotificationVariant;
  } | null>(null);
  const notificationIdRef = useRef(0);
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const packagesHydratedRef = useRef(false);
  const [networkStates, setNetworkStates] = useState<NetworkStates>(DEFAULT_NETWORK_STATES);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [priceSyncing, setPriceSyncing] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [promoSlides, setPromoSlides] = useState<PromoSlide[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const hasActiveNotices = notices.some((n) => n.active);

  const dismissNotification = () => setTopNotification(null);

  const showNotification = ({
    title,
    description,
    variant,
  }: {
    title: string;
    description: string;
    variant: TopNotificationVariant;
  }) => {
    notificationIdRef.current += 1;
    setTopNotification({
      id: notificationIdRef.current,
      title,
      description,
      variant,
    });
  };

  const showToast = (
    msg: string,
    variant: 'success' | 'error' | 'info' = 'success',
    title?: string
  ) => {
    const defaultTitles = {
      success: 'Success',
      error: 'Error',
      info: 'Notice',
    };
    showNotification({
      title: title ?? defaultTitles[variant],
      description: msg,
      variant,
    });
  };

  const wrapWithSettings = (content: React.ReactNode, opts?: { admin?: boolean }) => {
    const isAdmin = opts?.admin ?? false;
    const topOffsetClass = isAdmin ? 'top-4' : hasActiveNotices ? 'top-[5.5rem]' : 'top-14';

    return (
      <SiteSettingsContext.Provider value={siteSettings}>
        {topNotification && (
          <TopNotificationCard
            key={topNotification.id}
            title={topNotification.title}
            description={topNotification.description}
            variant={topNotification.variant}
            topOffsetClass={topOffsetClass}
            layout={isAdmin ? 'admin' : 'customer'}
            onDismiss={dismissNotification}
          />
        )}
        {content}
        <SpeedInsights route={getAppRoute(activePage)} />
      </SiteSettingsContext.Provider>
    );
  };

  const refreshSiteSettings = () => {
    fetchSiteSettings()
      .then((settings) => {
        setSiteSettings(settings);
        setNetworkStates(settings.networkStates);
      })
      .catch(() => {
        showToast('Failed to load site settings', 'error');
      });
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
    refreshCustomerNotices();
    refreshPromoSlides();
    refreshSiteSettings();
  }, []);

  useEffect(() => {
    document.title = `${siteSettings.businessName} — Affordable Data Bundles in Ghana`;
  }, [siteSettings.businessName]);

  useEffect(() => {
    setPackagesLoading(true);
    fetch(PACKAGES_API)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load packages');
        return res.json() as Promise<DbPackage[]>;
      })
      .then((data) => {
        packagesHydratedRef.current = true;
        if (Array.isArray(data)) {
          setPackages(data.map(mapDbPackage));
        }
      })
      .catch(() => {
        packagesHydratedRef.current = true;
        const cached = loadCachedPackages();
        if (cached.length > 0) {
          setPackages(cached);
          showToast('Showing cached packages. Some prices may be outdated.', 'info');
        } else {
          showToast('Unable to load packages. Please try again later.', 'error');
        }
      })
      .finally(() => setPackagesLoading(false));
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

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status } : o)));
    try {
      await patchOrderStatus(orderId, status);
      showToast(`Order ${orderId} updated to ${status}`, 'success');
    } catch {
      showToast(`Failed to sync order ${orderId} status`, 'error');
    }
  };

  const showPriceUpdatedNotification = () => {
    showNotification({
      title: 'Price Updated',
      description: 'Prices have been updated. Please review the new price before continuing.',
      variant: 'error',
    });
  };

  const syncPricesFromDatabase = async (
    selected?: SelectedPackage
  ): Promise<{ ok: boolean; selected?: SelectedPackage }> => {
    setPriceSyncing(true);
    try {
      const fresh = await fetchFreshPackages();
      const mismatched = packagesHaveMismatch(packages, fresh);
      setPackages(fresh);

      let resolvedSelected = selected;
      if (selected) {
        const match = fresh.find(
          (p) => p.network === selected.network && p.size === selected.size
        );
        if (match) {
          resolvedSelected = {
            network: selected.network,
            size: selected.size,
            price: match.price,
          };
          setSelectedPackage(resolvedSelected);
        }
      }

      if (mismatched) {
        showPriceUpdatedNotification();
        return { ok: false, selected: resolvedSelected };
      }
      return { ok: true, selected: resolvedSelected };
    } catch {
      showToast('Unable to verify prices. Please try again.', 'error');
      return { ok: false };
    } finally {
      setPriceSyncing(false);
    }
  };

  const handlePackageSelect = async (pkg: SelectedPackage) => {
    if (priceSyncing) return;
    const { ok, selected } = await syncPricesFromDatabase(pkg);
    if (!ok) return;
    setSelectedPackage(selected ?? pkg);
    setShowModal(true);
  };

  const validateBeforePaystack = async (): Promise<SelectedPackage | null> => {
    if (!selectedPackage || priceSyncing) return null;
    const { ok, selected } = await syncPricesFromDatabase(selectedPackage);
    if (!ok || !selected) return null;
    return selected;
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
        </div>,
        { admin: true }
      );
    }
    if (!adminLoggedIn) {
      return wrapWithSettings(<AdminLogin onLogin={() => setAdminLoggedIn(true)} />, { admin: true });
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
      />,
      { admin: true }
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
          <BrandLogo className="w-8 h-8" />
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
          <BrandLogo className="w-6 h-6" />
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
            onPackageSelect={(pkg) => void handlePackageSelect(pkg)}
            packages={packages}
            networkStates={networkStates}
            promoSlides={promoSlides}
            priceSyncing={priceSyncing}
          />
        )}
        {activePage === 'buy-data' && (
          <BuyData
            onPackageSelect={(pkg) => void handlePackageSelect(pkg)}
            packages={packages}
            networkStates={networkStates}
            loading={packagesLoading}
            priceSyncing={priceSyncing}
          />
        )}
        {activePage === 'track-order' && <TrackOrder />}
      </main>

      <BuyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedPackage={selectedPackage}
        showToast={showToast}
        priceSyncing={priceSyncing}
        validateBeforePaystack={validateBeforePaystack}
      />

      <Analytics />
    </div>
  );
}
