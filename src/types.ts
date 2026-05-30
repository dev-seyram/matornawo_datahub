export type Page = 'dashboard' | 'buy-data' | 'track-order' | 'admin' | 'not-found';
export type Network = 'MTN' | 'AirtelTigo' | 'Telecel';
export type NetworkState = 'active' | 'disabled' | 'closed';
export type NetworkStates = Record<Network, NetworkState>;
export type AdminTab = 'orders' | 'packages' | 'networks' | 'notices' | 'promos' | 'settings';
export type OrderStatus = 'Pending' | 'Processing' | 'Delivered' | 'Failed';
export type TopNotificationVariant = 'error' | 'success' | 'info';

export interface SiteSettings {
  businessName: string;
  whatsappOrderReminderEnabled: boolean;
  whatsappSupportNumber: string;
  networkStates: NetworkStates;
}

export interface Order {
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

export interface TrackedOrder {
  orderId: string;
  network: Network;
  package: string;
  status: OrderStatus;
  date: string;
  updatedAt: string;
  recipientPhone: string;
}

export interface Package {
  id: string;
  size: string;
  price: number;
  validity: string;
  network: Network;
}

export interface SelectedPackage {
  size: string;
  price: number;
  network: Network;
}

export interface Notice {
  id: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export interface PromoSlide {
  index: number;
  title: string;
  headline: string;
  backgroundColor: string;
}

export type DbOrder = {
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
  updated_at?: string;
};

export type PublicDbOrder = {
  order_id: string;
  network: string;
  package: string;
  status: string;
  created_at: string;
  updated_at?: string;
  recipient_phone: string;
};

export type DbSiteSettings = {
  business_name: string;
  whatsapp_order_reminder_enabled: boolean;
  whatsapp_support_number?: string;
  network_states?: Partial<NetworkStates>;
};

export type DbPackage = {
  package_id: string;
  network: string;
  size: string;
  validity: string;
  price: number | string;
};

export type DbNotice = {
  notice_id: string;
  message: string;
  active: boolean;
  created_at: string;
};

export type DbPromoSlide = {
  slide_index: number;
  title: string;
  headline: string;
  background_color: string;
};
