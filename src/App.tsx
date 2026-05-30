import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Search,
  UserPlus,
  User,
  ChevronRight,
  Loader,
  Menu,
  Linkedin,
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { TrackOrder } from './pages/TrackOrder';
import { NotFound } from './pages/NotFound';
import { Dashboard } from './pages/Dashboard';
import { BuyData } from './pages/BuyData';
import { BuyModal } from './pages/BuyModal';
import { AdminLogin } from './pages/AdminLogin';
import { AdminPanel } from './pages/AdminPanel';
import { NoticeTicker } from './components/NoticeTicker';
import { TopNotificationCard } from './components/TopNotificationCard';
import { BrandLogo } from './components/BrandLogo';
import { getInitialPage, getAppRoute, navigateToPage } from './routes';
import { SiteSettingsContext } from './context/SiteSettingsContext';
import {
  defaultSiteSettings,
  DEFAULT_NETWORK_STATES,
  PACKAGES_STORAGE_KEY,
  DEVELOPER_LINKEDIN_URL,
  ADMIN_LOGOUT_API,
  ADMIN_SESSION_API,
  PACKAGES_API,
  PAGE_TITLES,
} from './constants';
import { loadCachedPackages, packagesHaveMismatch } from './lib/packages';
import {
  adminFetch,
  fetchSiteSettings,
  fetchOrders,
  fetchActiveNotices,
  fetchPromoSlides,
  fetchFreshPackages,
  patchOrderStatus,
  mapDbPackage,
} from './api/client';
import type {
  Page,
  NetworkStates,
  SiteSettings,
  OrderStatus,
  Order,
  Package,
  SelectedPackage,
  Notice,
  PromoSlide,
  TopNotificationVariant,
  DbPackage,
} from './types';

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
    const pageLabel = PAGE_TITLES[activePage] ?? 'Home';
    document.title = `${pageLabel} — ${siteSettings.businessName}`;
  }, [activePage, siteSettings.businessName]);

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

  const goToPage = (page: Page) => {
    navigateToPage(page, setActivePage);
  };

  const handleAdminLogout = () => {
    void adminFetch(ADMIN_LOGOUT_API, { method: 'POST' }).finally(() => {
      setAdminLoggedIn(false);
      setOrders([]);
      goToPage('dashboard');
    });
  };

  const navItems: { id: Exclude<Page, 'admin' | 'not-found'>; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'buy-data', label: 'Buy Data', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'track-order', label: 'Track Order', icon: <Search className="w-4 h-4" /> },
  ];

  // ── Special pages ──
  if (activePage === 'not-found') return wrapWithSettings(<NotFound onGoHome={() => goToPage('dashboard')} />);

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
              onClick={() => { goToPage(item.id); setSidebarOpen(false); }}
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
        {activePage === 'track-order' && <TrackOrder showToast={showToast} />}
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

