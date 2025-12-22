import React, { useEffect, useMemo, useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { userService, User } from '../../services/userService';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useAllocateFloat } from '../../hooks/mutations/finance';

interface AllocateFloatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
}

export default function AllocateFloatModal({ isOpen, onClose, currency = 'USD' }: AllocateFloatModalProps) {
  const { id: currentUserId, name: currentUserName } = useCurrentUser();
  const allocateFloat = useAllocateFloat();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [driverId, setDriverId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        // Fetch users with role 'Driver'
        const result = await userService.getUsers(undefined, { role: 'Driver', status: 'Active', limit: 100 });
        setDrivers(result.users);
      } catch (e) {
        console.error(e);
      }
    };
    if (isOpen) loadDrivers();
  }, [isOpen]);

  const filteredDrivers = useMemo(() => {
    const term = search.toLowerCase();
    return drivers.filter(d => (d.name || '').toLowerCase().includes(term) || (d.email || '').toLowerCase().includes(term));
  }, [drivers, search]);

  const handleAllocate = async () => {
    if (!driverId || !amount || amount <= 0) {
      setError('Please select a driver and enter a valid amount');
      return;
    }
    setError(null);
    const driver = drivers.find(d => d.id === driverId);
    allocateFloat.mutate(
      {
        driverId,
        driverName: driver?.name,
        amount,
        currency,
        allocatedByUserId: currentUserId,
        allocatedByUserName: currentUserName
      },
      {
        onSuccess: () => {
          onClose();
          setDriverId('');
          setAmount(0);
        },
        onError: (e: any) => {
          setError(e?.message || 'Failed to allocate float');
        }
      }
    );
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Allocate Driver Float</h3>
          <button className="p-1 rounded hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="p-2 text-sm text-red-700 bg-red-50 rounded">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Driver</label>
            <input
              type="text"
              placeholder="Search driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select driver</option>
              {filteredDrivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">{currency}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-r border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
          <button
            onClick={handleAllocate}
            disabled={allocateFloat.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
            <PlusCircle className="w-4 h-4" />
            {allocateFloat.isPending ? 'Allocating...' : 'Allocate'}
          </button>
        </div>
      </div>
    </div>
  );
}


