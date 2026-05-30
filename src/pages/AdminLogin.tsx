import { useState } from 'react';
import { adminFetch } from '../api/client';
import { ADMIN_LOGIN_API } from '../constants';
import { BrandLogo } from '../components/BrandLogo';
import { useSiteSettings } from '../context/SiteSettingsContext';

export function AdminLogin({ onLogin }: { onLogin: () => void; showToast?: (msg: string, variant?: 'success' | 'error' | 'info', title?: string) => void }) {
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
