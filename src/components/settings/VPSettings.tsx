import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { vpService } from '../../services/vpService';
import { VPSettings } from '../../types/finance';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export default function VPSettingsComponent() {
  const { id: currentUserId, name: currentUserName } = useCurrentUser();
  const [settings, setSettings] = useState<VPSettings | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const s = await vpService.getSettings();
      setSettings(s);
      if (s) {
        setAmount(s.defaultAmountPerSample);
        setCurrency(s.currency);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = vpService.onSettingsChange((s) => {
      setSettings(s);
      if (s) {
        setAmount(s.defaultAmountPerSample);
        setCurrency(s.currency);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!amount || amount <= 0 || !currency) {
      setError('Enter a valid amount and currency');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await vpService.setSettings({
        defaultAmountPerSample: amount,
        currency,
        updatedByUserId: currentUserId,
        updatedByUserName: currentUserName
      });
      setMessage('Settings saved');
      setTimeout(() => setMessage(null), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-secondary-900">Finance: Venepuncture Settings</h2>
        <p className="text-secondary-600">Configure default payable per sample and currency</p>
      </div>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        {loading ? (
          <div className="animate-pulse text-secondary-600">Loading settings...</div>
        ) : (
          <>
            {message && <div className="p-2 rounded bg-green-50 text-green-700">{message}</div>}
            {error && <div className="p-2 rounded bg-red-50 text-red-700">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default VP amount per sample</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


