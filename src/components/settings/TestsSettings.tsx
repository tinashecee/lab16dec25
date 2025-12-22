import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { syncTestsWithFirebase, CrelioTest } from '../../services/crelioApi';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { TestsTable } from './TestsTable';
import { SyncProgress } from '../common/SyncProgress';
import { toast } from '../ui/use-toast';

export default function TestsSettings() {
  console.log('TestsSettings rendered');

  const [tests, setTests] = useState<CrelioTest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<{
    total: number;
    updated: number;
    new: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tests'),
      (snapshot) => {
        const testsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CrelioTest[];
        setTests(testsData);
      },
      (error) => {
        console.error('Error fetching tests:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch tests from database"
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    console.log('handleSync called');
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResults(null);

    try {
      console.log('Starting sync...');
      const results = await syncTestsWithFirebase((progress) => {
        console.log('Progress:', progress);
        setSyncProgress(progress);
      });

      console.log('Sync results:', results);

      setSyncResults({
        total: results.total,
        updated: results.updated,
        new: results.new
      });

      toast({
        title: "Success",
        description: `Synced ${results.total} tests (${results.new} new, ${results.updated} updated)`
      });
    } catch (error) {
      console.error('Error syncing with Crelio:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sync with Crelio"
      });
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncResults(null);
      }, 3000);
    }
  };

  const handleUpdateTATs = async (updates: { testID: number; normalTAT?: string; urgentTAT?: string }[]) => {
    try {
      // Update in Firebase
      const batch = writeBatch(db);
      
      updates.forEach(update => {
        const testRef = doc(db, 'tests', update.testID.toString());
        batch.update(testRef, {
          normalTAT: update.normalTAT,
          urgentTAT: update.urgentTAT,
          lastUpdated: new Date().toISOString()
        });
      });

      await batch.commit();

      // Update local state
      setTests(prevTests => 
        prevTests.map(test => {
          const update = updates.find(u => u.testID === test.testID);
          if (update) {
            return {
              ...test,
              normalTAT: update.normalTAT || test.normalTAT,
              urgentTAT: update.urgentTAT || test.urgentTAT
            };
          }
          return test;
        })
      );

      return true;
    } catch (error) {
      console.error('Error updating TATs:', error);
      throw error;
    }
  };

  console.log('handleSync is:', handleSync);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tests</h2>
          <p className="text-sm text-gray-500">Manage tests and profiles</p>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Debug: {tests.length} tests loaded, sync {isSyncing ? 'in progress' : 'idle'}
      </div>

      <TestsTable 
        data={tests} 
        onSync={handleSync}
        isSyncing={isSyncing}
        onUpdateTATs={handleUpdateTATs}
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