import type { NetworkState, NetworkStates, SiteSettings } from './types';

export const DEFAULT_BUSINESS_NAME = 'MATOE CONNECT';
export const DEFAULT_WHATSAPP_SUPPORT_NUMBER = '233534764068';
export const ADMIN_PATH = (
  (import.meta.env.VITE_ADMIN_PATH as string | undefined) || '/dev_seyram'
).replace(/\/+$/, '').toLowerCase();

export const DEFAULT_NETWORK_STATES: NetworkStates = {
  MTN: 'active',
  AirtelTigo: 'disabled',
  Telecel: 'disabled',
};

export const defaultSiteSettings: SiteSettings = {
  businessName: DEFAULT_BUSINESS_NAME,
  whatsappOrderReminderEnabled: true,
  whatsappSupportNumber: DEFAULT_WHATSAPP_SUPPORT_NUMBER,
  networkStates: DEFAULT_NETWORK_STATES,
};

export const PACKAGES_STORAGE_KEY = 'matornawo_packages';
export const DEVELOPER_LINKEDIN_URL = 'https://www.linkedin.com/in/seyramgblorkpor/';

export const NETWORK_STATE_DESCRIPTIONS: Record<NetworkState, string> = {
  active: 'Network is active — customers can buy packages',
  disabled: "Network is disabled — customers see 'Coming Soon'",
  closed: "Network is closed — customers see 'Store Closed'",
};

export const ORDERS_API = '/api/orders';
export const PAYSTACK_VERIFY_API = '/api/paystack/verify';
export const ADMIN_LOGIN_API = '/api/admin/login';
export const ADMIN_LOGOUT_API = '/api/admin/logout';
export const ADMIN_SESSION_API = '/api/admin/session';
export const ADMIN_TELEGRAM_TEST_API = '/api/admin/telegram-test';
export const ADMIN_INTEGRATIONS_API = '/api/admin/integrations';
export const SETTINGS_API = '/api/settings';
export const PACKAGES_API = '/api/packages';
export const NOTICES_API = '/api/notices';
export const PROMO_SLIDES_API = '/api/promo-slides';

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Home',
  'buy-data': 'Buy Data',
  'track-order': 'Track Order',
  admin: 'Admin',
  'not-found': 'Page Not Found',
};
