import fs from 'fs';

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);

function extract(start, end, outPath, prefix) {
  let body = lines.slice(start - 1, end).join('\n');
  body = body.replace(/^function (\w+)/, 'export function $1');
  fs.mkdirSync(outPath.split('/').slice(0, -1).join('/'), { recursive: true });
  fs.writeFileSync(outPath, prefix + body + '\n');
}

extract(91, 111, 'src/components/NoticeTicker.tsx', "import type { Notice } from '../types';\n\n");
extract(
  115,
  208,
  'src/pages/NotFound.tsx',
  `import { MessageCircle } from 'lucide-react';
import notFoundBg from '../assets/not-found-bg.png';
import { BrandLogo } from '../components/BrandLogo';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';

`
);
extract(212, 235, 'src/components/NetworkTabs.tsx', "import type { Network } from '../types';\n\n");
extract(
  239,
  254,
  'src/components/ComingSoon.tsx',
  "import { Rocket } from 'lucide-react';\nimport type { Network } from '../types';\n\n"
);
extract(
  258,
  290,
  'src/components/StoreClosed.tsx',
  `import { Lock, MessageCircle } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';
import type { Network } from '../types';

`
);
extract(
  294,
  348,
  'src/components/DataPackages.tsx',
  `import { Wifi } from 'lucide-react';
import { ComingSoon } from './ComingSoon';
import { StoreClosed } from './StoreClosed';
import type { Network, NetworkState, Package, SelectedPackage } from '../types';

`
);
extract(
  352,
  684,
  'src/pages/BuyModal.tsx',
  `import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader, X, CreditCard } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';
import { loadPaystackScript } from '../lib/paystack';
import { generateOrderId, verifyPayment } from '../api/client';
import type { Network, SelectedPackage } from '../types';

`
);
extract(
  688,
  729,
  'src/components/PromoCarousel.tsx',
  `import { useState, useEffect } from 'react';
import type { PromoSlide } from '../types';

`
);
extract(
  733,
  832,
  'src/pages/Dashboard.tsx',
  `import { useState } from 'react';
import { Clock, MessageCircle, UserPlus, Users } from 'lucide-react';
import happyCustomer from '../assets/happy-customer.png';
import { NetworkTabs } from '../components/NetworkTabs';
import { DataPackages } from '../components/DataPackages';
import { PromoCarousel } from '../components/PromoCarousel';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { buildWhatsAppUrl } from '../lib/format';
import type { Network, NetworkStates, Package, PromoSlide, SelectedPackage } from '../types';

`
);
extract(
  836,
  876,
  'src/pages/BuyData.tsx',
  `import { useState } from 'react';
import { Loader } from 'lucide-react';
import { NetworkTabs } from '../components/NetworkTabs';
import { DataPackages } from '../components/DataPackages';
import type { Network, NetworkStates, Package, SelectedPackage } from '../types';

`
);
extract(
  1895,
  1958,
  'src/pages/AdminLogin.tsx',
  `import { useState } from 'react';
import { adminFetch } from '../api/client';
import { ADMIN_LOGIN_API } from '../constants';
import { BrandLogo } from '../components/BrandLogo';
import { useSiteSettings } from '../context/SiteSettingsContext';

`
);

extract(
  880,
  1891,
  'src/pages/AdminPanel.tsx',
  `import { useState, useEffect } from 'react';
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

`
);

console.log('Extracted UI modules');
