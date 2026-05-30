import fs from 'fs';

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const shellStart = lines.findIndex((l) => l.includes('// ─── APP ───'));
if (shellStart < 0) {
  console.error('APP section not found');
  process.exit(1);
}
const shell = lines.slice(shellStart).join('\n');

const header = `import { useState, useEffect, useRef } from 'react';
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
`;

fs.writeFileSync('src/App.tsx', `${header}\n${shell}\n`);
console.log('Wrote slim App.tsx, lines:', header.split('\n').length + shell.split('\n').length);
