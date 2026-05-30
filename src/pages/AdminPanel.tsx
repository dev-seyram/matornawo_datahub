import { useState, useEffect } from 'react';
import {
  LogOut,
  MessageCircle,
  Edit2,
  Trash2,
  Plus,
  Megaphone,
  Settings,
} from 'lucide-react';
import {
  adminFetch,
  getStatusBadgeClass,
  mapDbNotice,
  mapDbPackage,
} from '../api/client';
import { formatOrderDateTime } from '../lib/format';
import {
  ADMIN_TELEGRAM_TEST_API,
  ADMIN_INTEGRATIONS_API,
  SETTINGS_API,
  PACKAGES_API,
  NOTICES_API,
  PROMO_SLIDES_API,
  NETWORK_STATE_DESCRIPTIONS,
} from '../constants';
import type {
  AdminTab,
  DbNotice,
  DbPackage,
  DbPromoSlide,
  DbSiteSettings,
  Network,
  NetworkState,
  NetworkStates,
  Notice,
  Order,
  OrderStatus,
  Package,
  PromoSlide,
  SiteSettings,
} from '../types';

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

export function AdminPanel({
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
    whatsappSupportNumber: siteSettings.whatsappSupportNumber,
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
  const [telegramTestState, setTelegramTestState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [telegramTestMessage, setTelegramTestMessage] = useState('');

  useEffect(() => {
    if (telegramTestState !== 'success') return;
    const id = window.setTimeout(() => {
      setTelegramTestState('idle');
      setTelegramTestMessage('');
    }, 8000);
    return () => window.clearTimeout(id);
  }, [telegramTestState]);

  const handleTestTelegram = () => {
    if (telegramTestState === 'sending') return;
    setTelegramTestState('sending');
    setTelegramTestMessage('');
    showToast('Sending test message…', 'info');

    adminFetch(ADMIN_TELEGRAM_TEST_API, { method: 'POST' })
      .then(async (res) => {
        let data: { ok?: boolean; error?: string } = {};
        try {
          data = (await res.json()) as { ok?: boolean; error?: string };
        } catch {
          // non-JSON body
        }
        if (res.ok && data.ok) {
          const msg = 'Sent — check your Telegram app.';
          setTelegramTestState('success');
          setTelegramTestMessage(msg);
          showToast('Test Telegram sent — check your phone', 'success');
          return;
        }
        const errMsg = data.error || `Telegram test failed (${res.status})`;
        setTelegramTestState('error');
        setTelegramTestMessage(errMsg);
        showToast(errMsg, 'error');
      })
      .catch(() => {
        const errMsg = 'Telegram test failed — network error';
        setTelegramTestState('error');
        setTelegramTestMessage(errMsg);
        showToast(errMsg, 'error');
      });
  };

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
        whatsappSupportNumber: siteSettings.whatsappSupportNumber,
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
    const whatsappDigits = settingsDraft.whatsappSupportNumber.replace(/\D/g, '');
    if (!businessName) {
      showToast('Business name is required', 'error');
      return;
    }
    if (!/^233\d{9}$/.test(whatsappDigits)) {
      showToast('WhatsApp number must be 12 digits starting with 233 (e.g. 233534764068)', 'error');
      return;
    }
    adminFetch(SETTINGS_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: businessName,
        whatsapp_order_reminder_enabled: settingsDraft.whatsappOrderReminderEnabled,
        whatsapp_support_number: whatsappDigits,
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
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={telegramTestState === 'sending'}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              {telegramTestState === 'sending' ? 'Sending…' : 'Test Telegram'}
            </button>
            {telegramTestMessage && (
              <p
                className={`text-xs font-medium max-w-xs text-right ${
                  telegramTestState === 'success' ? 'text-green-700' : 'text-red-600'
                }`}
                role="status"
              >
                {telegramTestMessage}
              </p>
            )}
          </div>
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
                  {['Order ID', 'Network', 'Package', 'Phone', 'Total', 'Placed', 'Status'].map((col) => (
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
                        {formatOrderDateTime(order.date)}
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
              <h3 className="font-bold text-gray-800">WhatsApp support number</h3>
            </div>
            <p className="text-xs text-gray-500">
              Used for customer support links and order confirmation messages (wa.me). Format: 233XXXXXXXXX
            </p>
            <input
              type="tel"
              value={settingsDraft.whatsappSupportNumber}
              onChange={(e) =>
                setSettingsDraft((prev) => ({
                  ...prev,
                  whatsappSupportNumber: e.target.value.replace(/\D/g, '').slice(0, 12),
                }))
              }
              placeholder="233534764068"
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
