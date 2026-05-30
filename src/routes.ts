import { ADMIN_PATH } from './constants';
import type { Page } from './types';

const CUSTOMER_PATHS: Record<string, Page> = {
  '': 'dashboard',
  '/': 'dashboard',
  '/buy-data': 'buy-data',
  '/track-order': 'track-order',
};

export function getInitialPage(): Page {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/+$/, '').toLowerCase() || '/';
    if (path === ADMIN_PATH) {
      return 'admin';
    }
    const page = CUSTOMER_PATHS[path];
    if (page) return page;
    return 'not-found';
  }
  return 'dashboard';
}

export function getAppRoute(page: Page): string {
  if (typeof window !== 'undefined' && page === 'not-found') {
    return window.location.pathname;
  }
  if (page === 'admin') return ADMIN_PATH;
  if (page === 'dashboard') return '/';
  return `/${page}`;
}

export function navigateToPage(page: Page, setActivePage: (p: Page) => void) {
  setActivePage(page);
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', getAppRoute(page));
  }
}
