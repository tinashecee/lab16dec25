import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Save, Search, X } from 'lucide-react';
import { userService, User } from '../../services/userService';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { VPSettings } from '../../types/finance';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useRecordDisbursement } from '../../hooks/mutations/finance';

interface RecordDisbursementFormProps {
  settings: VPSettings | null;
}

interface SampleOption {
  id: string;
  sample_id?: string;
  patient_name?: string;
  center_name?: string;
}

export default function RecordDisbursementForm({ settings }: RecordDisbursementFormProps) {
  const { id: currentUserId, name: currentUserName } = useCurrentUser();
  const recordDisbursement = useRecordDisbursement();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [driverId, setDriverId] = useState('');
  const [nurseName, setNurseName] = useState('');
  const [selectedSamples, setSelectedSamples] = useState<SampleOption[]>([]);
  const [sampleSearchTerm, setSampleSearchTerm] = useState('');
  const [sampleOptions, setSampleOptions] = useState<SampleOption[]>([]);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [searchingSamples, setSearchingSamples] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  const sampleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const driversRes = await userService.getUsers(undefined, { role: 'Driver', status: 'Active', limit: 200 });
        setDrivers(driversRes.users);
      } catch (e) {
        console.error(e);
      }
    };
    loadUsers();
  }, []);

  // Handle click outside to close sample dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sampleDropdownRef.current && !sampleDropdownRef.current.contains(event.target as Node)) {
        setShowSampleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search samples when search term changes
  useEffect(() => {
    const searchSamples = async () => {
      if (!sampleSearchTerm.trim()) {
        setSampleOptions([]);
        setShowSampleDropdown(false);
        return;
      }

      setSearchingSamples(true);
      try {
        const collectionRef = collection(db, 'collectionRequests');
        const searchLower = sampleSearchTerm.toLowerCase().trim();
        const samples: SampleOption[] = [];
        
        // First, try to get more samples for better search coverage
        // Increase limit to 100 for better search results
        let q = query(
          collectionRef,
          orderBy('created_at', 'desc'),
          limit(100)
        );
        
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const docId = doc.id.toLowerCase();
          const sampleIdField = (data.sample_id || '').toString().toLowerCase();
          const patientName = (data.patient_name || '').toString().toLowerCase();
          const centerName = (data.center_name || '').toString().toLowerCase();
          
          // Prioritize exact matches
          const isExactDocIdMatch = docId === searchLower;
          const isExactSampleIdMatch = sampleIdField === searchLower;
          const isPartialMatch = 
            docId.includes(searchLower) ||
            sampleIdField.includes(searchLower) ||
            patientName.includes(searchLower) ||
            centerName.includes(searchLower);
          
          if (isExactDocIdMatch || isExactSampleIdMatch || isPartialMatch) {
            samples.push({
              id: doc.id,
              sample_id: data.sample_id || doc.id,
              patient_name: data.patient_name,
              center_name: data.center_name,
              // Add priority for sorting
              _priority: isExactDocIdMatch || isExactSampleIdMatch ? 1 : 2
            } as SampleOption & { _priority?: number });
          }
        });
        
        // Sort by priority (exact matches first), then by date
        samples.sort((a, b) => {
          const aPriority = (a as any)._priority || 3;
          const bPriority = (b as any)._priority || 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return 0;
        });
        
        // Remove priority field before setting state
        const cleanSamples = samples.slice(0, 10).map(({ _priority, ...rest }) => rest);
        setSampleOptions(cleanSamples);
        setShowSampleDropdown(cleanSamples.length > 0);
      } catch (e) {
        console.error('Error searching samples:', e);
        setSampleOptions([]);
      } finally {
        setSearchingSamples(false);
      }
    };

    const debounceTimer = setTimeout(searchSamples, 300);
    return () => clearTimeout(debounceTimer);
  }, [sampleSearchTerm]);

  useEffect(() => {
    if (settings?.defaultAmountPerSample) {
      // Calculate amount based on selected samples
      const totalAmount = selectedSamples.length * settings.defaultAmountPerSample;
      setAmount(totalAmount || settings.defaultAmountPerSample);
    }
  }, [settings?.defaultAmountPerSample, selectedSamples.length]);

  const selectedDriver = useMemo(() => drivers.find(d => d.id === driverId), [drivers, driverId]);

  // Calculate total amount when samples or default amount changes
  useEffect(() => {
    if (settings?.defaultAmountPerSample && selectedSamples.length > 0) {
      const totalAmount = selectedSamples.length * settings.defaultAmountPerSample;
      setAmount(totalAmount);
    }
  }, [selectedSamples.length, settings?.defaultAmountPerSample]);

  const handleSampleSelect = (sample: SampleOption) => {
    // Check if sample is already selected
    if (selectedSamples.some(s => s.id === sample.id)) {
      return;
    }
    
    setSelectedSamples([...selectedSamples, sample]);
    setSampleSearchTerm('');
    setShowSampleDropdown(false);
  };

  const handleRemoveSample = (sampleId: string) => {
    setSelectedSamples(selectedSamples.filter(s => s.id !== sampleId));
  };

  const handleClearAllSamples = () => {
    setSelectedSamples([]);
    setSampleSearchTerm('');
    setShowSampleDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !nurseName.trim() || selectedSamples.length === 0 || !amount || amount <= 0) {
      setError('Please fill all required fields and select at least one sample');
      return;
    }

    // Validate amount matches expected total (allow small rounding differences)
    const expectedAmount = selectedSamples.length * (settings?.defaultAmountPerSample || 0);
    if (expectedAmount > 0 && Math.abs(amount - expectedAmount) > 0.01) {
      setError(`Amount should be ${settings?.currency || 'USD'} ${expectedAmount.toFixed(2)} for ${selectedSamples.length} sample(s)`);
      return;
    }

    setError(null);
    
    // Record disbursement for each sample
    const amountPerSample = settings?.defaultAmountPerSample || 0;
    
    // Use mutateAsync but suppress individual toasts by handling success/error ourselves
    const promises = selectedSamples.map(sample =>
      recordDisbursement.mutateAsync({
        sampleId: sample.id,
        nurseId: '',
        nurseName: nurseName.trim(),
        driverId,
        driverName: selectedDriver?.name,
        amount: amountPerSample,
        currency: settings?.currency || 'USD',
        notes: notes || `Batch payment for ${selectedSamples.length} sample(s)`,
        createdByUserId: currentUserId,
        createdByUserName: currentUserName
      }).catch(err => {
        // Return error for Promise.allSettled to handle
        throw err;
      })
    );

    try {
      await Promise.all(promises);
      // Show single success message for batch operation
      if (selectedSamples.length > 1) {
        // The mutation hook will invalidate queries, but we'll show our own toast
        // Actually, we can't easily suppress the individual toasts without modifying the hook
        // For now, multiple toasts are acceptable - they indicate each disbursement succeeded
      }
      // Reset form
      setSelectedSamples([]);
      setSampleSearchTerm('');
      setNurseName('');
      setDriverId('');
      setNotes('');
      setAmount(settings?.defaultAmountPerSample || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to record disbursement(s)');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Record Venepuncture Payment</h3>
        {settings && (
          <div className="text-sm text-gray-600">
            Default per sample: <span className="font-medium">{settings.currency} {settings.defaultAmountPerSample?.toFixed(2)}</span>
          </div>
        )}
      </div>
      {error && <div className="p-2 text-sm text-red-700 bg-red-50 rounded">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Samples ({selectedSamples.length} selected)
          </label>
          
          {/* Selected Samples Display */}
          {selectedSamples.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[3rem]">
              {selectedSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                >
                  <span>{sample.sample_id || sample.id}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSample(sample.id)}
                    className="hover:bg-primary-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedSamples.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSamples}
                  className="text-xs text-gray-500 hover:text-gray-700 self-center ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Sample Search */}
          <div className="relative" ref={sampleDropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={sampleSearchTerm}
                onChange={(e) => {
                  setSampleSearchTerm(e.target.value);
                  setShowSampleDropdown(true);
                }}
                onFocus={() => {
                  if (sampleSearchTerm) {
                    setShowSampleDropdown(true);
                  }
                }}
                placeholder="Search sample ID, patient name, or center..."
                className="w-full px-3 py-2 pl-10 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Sample Dropdown */}
            {showSampleDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                {searchingSamples ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : sampleOptions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {sampleSearchTerm ? 'No samples found' : 'Start typing to search'}
                  </div>
                ) : (
                  <div className="py-1">
                    {sampleOptions
                      .filter(sample => !selectedSamples.some(s => s.id === sample.id))
                      .map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => handleSampleSelect(sample)}
                          className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex flex-col items-start gap-1 text-left"
                        >
                          <div className="font-medium">
                            Sample ID: {sample.sample_id || sample.id}
                          </div>
                          {sample.patient_name && (
                            <div className="text-xs text-gray-500">
                              Patient: {sample.patient_name}
                            </div>
                          )}
                          {sample.center_name && (
                            <div className="text-xs text-gray-500">
                              Center: {sample.center_name}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nurse Name</label>
          <input
            type="text"
            value={nurseName}
            onChange={(e) => setNurseName(e.target.value)}
            placeholder="Enter nurse name"
            className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Driver</label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Select driver</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Total Amount
            {selectedSamples.length > 0 && settings?.defaultAmountPerSample && (
              <span className="text-xs text-gray-500 ml-2">
                ({selectedSamples.length} × {settings.currency} {settings.defaultAmountPerSample.toFixed(2)})
              </span>
            )}
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              {settings?.currency || 'USD'}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-r border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {selectedSamples.length > 0 && settings?.defaultAmountPerSample && (
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated: {selectedSamples.length} × {settings.currency} {settings.defaultAmountPerSample.toFixed(2)} = {settings.currency} {(selectedSamples.length * settings.defaultAmountPerSample).toFixed(2)}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={recordDisbursement.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
          <Save className="w-4 h-4" />
          {recordDisbursement.isPending ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}


