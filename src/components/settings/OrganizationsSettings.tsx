import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { syncOrganizationsWithFirebase } from '../../services/crelioApi';
import { Button } from '../ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { DataTable } from '../ui/DataTable';
import { SyncProgress } from '../common/SyncProgress';

interface Organization {
  id: string;
  name: string;
  type: string;
  contact: string;
  address: string;
  email: string;
  lastSynced?: string;
  source: 'crelio' | 'local';
}

export default function OrganizationsSettings() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<{
    total: number;
    updated: number;
    new: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'organizations'),
      (snapshot) => {
        const orgsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Organization[];
        setOrganizations(orgsData);
      },
      (error) => {
        console.error('Error fetching organizations:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResults(null);

    try {
      const results = await syncOrganizationsWithFirebase((progress) => {
        setSyncProgress(progress);
      });

      setSyncResults({
        total: results.total,
        updated: results.updated,
        new: results.new
      });
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      // Keep the results visible for a moment before closing
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncResults(null);
      }, 3000);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'contact', label: 'Contact' },
    { key: 'address', label: 'Address' },
    { key: 'email', label: 'Email' },
    {
      key: 'lastSynced',
      label: 'Last Synced',
      render: (value: string, row: Organization) => (
        <div>
          {value ? new Date(value).toLocaleString() : 'Never'}
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {row.source}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Organizations</h2>
          <p className="text-sm text-gray-500">Manage healthcare organizations</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSync}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync with Crelio
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Organization
          </Button>
        </div>
      </div>

      <DataTable
        data={organizations}
        columns={columns}
        title="Organizations"
        pageSize={10}
        onRowClick={setSelectedOrg}
      />

      {(isSyncing || syncResults) && (
        <SyncProgress 
          progress={syncProgress}
          isSyncing={isSyncing}
          results={syncResults || undefined}
        />
      )}
    </div>
  );
} 