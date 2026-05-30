import {
  ORDERS_API,
  PAYSTACK_VERIFY_API,
  SETTINGS_API,
  PACKAGES_API,
  NOTICES_API,
  PROMO_SLIDES_API,
} from '../constants';
import type {
  DbOrder,
  DbPackage,
  DbNotice,
  DbPromoSlide,
  DbSiteSettings,
  Network,
  NetworkStates,
  Notice,
  Order,
  OrderStatus,
  Package,
  PromoSlide,
  PublicDbOrder,
  SiteSettings,
  TrackedOrder,
} from '../types';
import { DEFAULT_WHATSAPP_SUPPORT_NUMBER } from '../constants';

export function mapNetworkStates(raw: unknown): NetworkStates {
  const states = raw as Partial<NetworkStates> | undefined;
  return {
    MTN: states?.MTN ?? 'active',
    AirtelTigo: states?.AirtelTigo ?? 'disabled',
    Telecel: states?.Telecel ?? 'disabled',
  };
}

export function mapDbSiteSettings(row: DbSiteSettings): SiteSettings {
  return {
    businessName: row.business_name,
    whatsappOrderReminderEnabled: Boolean(row.whatsapp_order_reminder_enabled),
    whatsappSupportNumber: row.whatsapp_support_number ?? DEFAULT_WHATSAPP_SUPPORT_NUMBER,
    networkStates: mapNetworkStates(row.network_states),
  };
}

export function mapPublicOrder(row: PublicDbOrder): TrackedOrder {
  return {
    orderId: row.order_id,
    network: row.network as Network,
    package: row.package,
    status: row.status as OrderStatus,
    date: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    recipientPhone: row.recipient_phone,
  };
}

export function mapDbOrder(row: DbOrder): Order {
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

export function mapDbNotice(row: DbNotice): Notice {
  return {
    id: row.notice_id,
    message: row.message,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function mapDbPromoSlide(row: DbPromoSlide): PromoSlide {
  return {
    index: row.slide_index,
    title: row.title,
    headline: row.headline,
    backgroundColor: row.background_color,
  };
}

export function mapDbPackage(row: DbPackage): Package {
  return {
    id: row.package_id,
    network: row.network as Network,
    size: row.size,
    validity: row.validity,
    price: parseFloat(String(row.price)),
  };
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(SETTINGS_API);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return mapDbSiteSettings((await res.json()) as DbSiteSettings);
}

export function adminFetch(input: string, init?: RequestInit) {
  return fetch(input, { ...init, credentials: 'include' });
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await adminFetch(ORDERS_API);
  if (!res.ok) throw new Error('Failed to fetch orders');
  const data = (await res.json()) as DbOrder[];
  return data.map(mapDbOrder);
}

export class OrderTrackError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'OrderTrackError';
  }
}

export async function fetchOrderById(orderId: string): Promise<TrackedOrder | null> {
  const params = new URLSearchParams({ order_id: orderId });
  const res = await fetch(`${ORDERS_API}?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    let msg = 'Failed to fetch order';
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      // ignore
    }
    throw new OrderTrackError(msg, res.status);
  }
  return mapPublicOrder((await res.json()) as PublicDbOrder);
}

export async function fetchOrdersByPhone(phone: string): Promise<TrackedOrder[]> {
  const params = new URLSearchParams({ phone });
  const res = await fetch(`${ORDERS_API}?${params.toString()}`);
  if (!res.ok) {
    let msg = 'Failed to fetch orders';
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      // ignore
    }
    throw new OrderTrackError(msg, res.status);
  }
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

export async function verifyPayment(params: {
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
      // ignore
    }
    throw new Error(formatPaymentVerifyError(serverMsg));
  }
}

export async function patchOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const res = await adminFetch(ORDERS_API, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, status }),
  });
  if (!res.ok) throw new Error('Failed to update order');
  return mapDbOrder((await res.json()) as DbOrder);
}

export async function fetchActiveNotices(): Promise<Notice[]> {
  const res = await fetch(NOTICES_API);
  if (!res.ok) throw new Error('Failed to fetch notices');
  const data = (await res.json()) as DbNotice[];
  return data.map(mapDbNotice);
}

export async function fetchPromoSlides(): Promise<PromoSlide[]> {
  const res = await fetch(PROMO_SLIDES_API);
  if (!res.ok) throw new Error('Failed to fetch promo slides');
  const data = (await res.json()) as DbPromoSlide[];
  return data.map(mapDbPromoSlide);
}

export async function fetchFreshPackages(): Promise<Package[]> {
  const res = await fetch(PACKAGES_API);
  if (!res.ok) throw new Error('Failed to fetch packages');
  const data = (await res.json()) as DbPackage[];
  return Array.isArray(data) ? data.map(mapDbPackage) : [];
}

export const generateOrderId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ORD-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

export function getStatusBadgeClass(status: OrderStatus): string {
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
