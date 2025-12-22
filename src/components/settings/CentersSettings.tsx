import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { syncCentersWithFirebase, fetchCrelioCenters, CrelioCenter } from '../../services/crelioApi';
import { CollectionCenterForm } from './CollectionCenterForm';
import { Button } from '../ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { DataTable } from '../ui/DataTable';
import { CenterDetailsModal } from '../centers/CenterDetailsModal';
import { SyncProgress } from '../common/SyncProgress';
import { useToast } from "@/components/ui/use-toast"

export default function CentersSettings() {
  const { toast } = useToast();
  const [centers, setCenters] = useState<CrelioCenter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CrelioCenter | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<{
    total: number;
    updated: number;
    new: number;
  } | null>(null);

  useEffect(() => {
    // Subscribe to centers collection in Firebase
    const unsubscribe = onSnapshot(
      collection(db, 'centers'),
      (snapshot) => {
        const centersData = snapshot.docs.map(doc => ({
          ...doc.data()
        })) as CrelioCenter[];
        setCenters(centersData);
      },
      (error) => {
        console.error('Error fetching centers:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch centers from database"
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResults(null);

    try {
      // First fetch from Crelio API
      const results = await syncCentersWithFirebase((progress) => {
        setSyncProgress(progress);
      });

      setSyncResults({
        total: results.total,
        updated: results.updated,
        new: results.new
      });

      toast({
        title: "Success",
        description: `Synced ${results.total} centers (${results.new} new, ${results.updated} updated)`
      });

    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sync with Crelio"
      });
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
    { 
      key: 'docId', 
      label: 'ID',
      width: '80px' 
    },
    { 
      key: 'docFullName', 
      label: 'Name',
      width: '200px'
    },
    { 
      key: 'designation', 
      label: 'Designation',
      width: '120px'
    },
    { 
      key: 'docSpeciality', 
      label: 'Speciality',
      width: '150px'
    },
    { 
      key: 'docContact', 
      label: 'Contact',
      width: '130px',
      render: (value: string, center: CrelioCenter) => (
        <div>
          {center.countryCode && `+${center.countryCode} `}{value}
        </div>
      )
    },
    { 
      key: 'docCity', 
      label: 'City',
      width: '120px'
    },
    { 
      key: 'docAddress', 
      label: 'Address',
      width: '200px'
    },
    { 
      key: 'docEmail', 
      label: 'Email',
      width: '200px'
    },
    {
      key: 'visitTimings',
      label: 'Working Hours',
      width: '200px',
      render: (value: Array<{day: string, from: string, to: string}>) => {
        if (!value?.length) return 'Not set';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const firstTiming = value[0];
        return (
          <div className="text-sm">
            <div>{firstTiming.from} - {firstTiming.to}</div>
            <div className="text-gray-500 text-xs">
              {value.map(t => days[parseInt(t.day)]).join(', ')}
            </div>
          </div>
        );
      }
    },
    {
      key: 'coordinates',
      label: 'Location',
      width: '100px',
      render: (value: { lat: number, lng: number } | undefined) => (
        value ? (
          <div className="text-sm">
            <div>{value.lat.toFixed(6)}</div>
            <div>{value.lng.toFixed(6)}</div>
          </div>
        ) : 'Not set'
      )
    },
    {
      key: 'source',
      label: 'Source',
      width: '100px',
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          value === 'crelio' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'lastSynced',
      label: 'Last Updated',
      width: '150px',
      render: (value: string) => (
        value ? new Date(value).toLocaleString() : 'Never'
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (_: any, center: CrelioCenter) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenDetails(center)}
        >
          Details
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Collection Centers</h2>
          <p className="text-sm text-gray-500">Manage sample collection centers</p>
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
            Add Center
          </Button>
        </div>
      </div>

      <DataTable
        data={centers}
        columns={columns}
        title="Collection Centers"
        pageSize={10}
        onRowClick={setSelectedCenter}
      />

      {selectedCenter && (
        <CenterDetailsModal
          isOpen={!!selectedCenter}
          onClose={() => setSelectedCenter(null)}
          center={selectedCenter}
        />
      )}

      <CollectionCenterForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (data) => {
          try {
            await saveCenter({
              docId: Date.now(), // Generate a unique ID
              docFullName: data.centerName,
              docContact: data.phone || '',
              docAddress: data.address,
              docEmail: data.email || '',
              docSpeciality: '',
              coordinates: data.coordinates,
              visitTimings: [],
              // Add other required fields with default values
              orgId: 0,
              docCity: '',
              docdateOfBirth: '',
              labForId: 0,
              designation: '',
              docRegNo: '',
              countryCode: ''
            });
            setIsFormOpen(false);
            toast({
              title: "Success",
              description: "Center added successfully"
            });
          } catch (error) {
            console.error('Error saving center:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to add center"
            });
          }
        }}
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