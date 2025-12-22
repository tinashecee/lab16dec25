import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface IntegrationsConfig {
  crelioToken: string;
  mapsApiKey: string;
}

const SETTINGS_DOC_ID = 'integrations';

export default function IntegrationsSettings() {
  const [config, setConfig] = useState<IntegrationsConfig>({
    crelioToken: '',
    mapsApiKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCrelioToken, setShowCrelioToken] = useState(false);
  const [showMapsKey, setShowMapsKey] = useState(false);

  useEffect(() => {
    loadIntegrationSettings();
  }, []);

  const loadIntegrationSettings = async () => {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setConfig(docSnap.data() as IntegrationsConfig);
      }
    } catch (error) {
      console.error('Error loading integration settings:', error);
      alert('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      await setDoc(docRef, {
        ...config,
        mapsApiKey: config.mapsApiKey,
        updatedAt: new Date().toISOString()
      });
      
      window.location.reload();
      
      alert('Integration settings saved successfully');
    } catch (error) {
      console.error('Error saving integration settings:', error);
      alert('Failed to save integration settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">API Integrations</h2>
        <p className="text-sm text-gray-500">Configure external API connections and authentication</p>
      </div>

      {/* Crelio API */}
      <Card>
        <CardHeader>
          <CardTitle>Crelio API</CardTitle>
          <CardDescription>Configure authentication for all Crelio services (Patient Management, Organizations, Centers, Tests)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Lab Token</label>
            <div className="relative">
              <Input 
                type={showCrelioToken ? "text" : "password"}
                placeholder="Enter Lab Token" 
                value={config.crelioToken}
                onChange={(e) => setConfig({
                  ...config,
                  crelioToken: e.target.value
                })}
              />
              <button
                type="button"
                onClick={() => setShowCrelioToken(!showCrelioToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showCrelioToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This token will be used for all Crelio API endpoints:
            </p>
            <ul className="mt-1 ml-4 text-sm text-gray-500 list-disc">
              <li>Patient Registration & Billing (/LHRegisterBillAPI)</li>
              <li>Organizations (/androidOrganizationListForCC)</li>
              <li>Collection Centers (/androidReferralListForCC)</li>
              <li>Tests (/getAllTestsAndProfiles)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Maps API */}
      <Card>
        <CardHeader>
          <CardTitle>Google Maps API</CardTitle>
          <CardDescription>Configure Google Maps integration for location services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Maps API Key</label>
            <div className="relative">
              <Input 
                type={showMapsKey ? "text" : "password"}
                placeholder="Enter Google Maps API key"
                value={config.mapsApiKey}
                onChange={(e) => setConfig({
                  ...config,
                  mapsApiKey: e.target.value
                })}
              />
              <button
                type="button"
                onClick={() => setShowMapsKey(!showMapsKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showMapsKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
} 