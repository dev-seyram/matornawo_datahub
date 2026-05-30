import { createContext, useContext } from 'react';
import { defaultSiteSettings } from '../constants';
import type { SiteSettings } from '../types';

export const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings);

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
