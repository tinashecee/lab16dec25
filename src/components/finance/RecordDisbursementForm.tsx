import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { userService, User } from '../../services/userService';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { VPSettings } from '../../types/finance';
import { useRecordDisbursement } from '../../hooks/mutations/finance';

interface RecordDisbursementFormProps {
  settings: VPSettings | null;
}

export default function RecordDisbursementForm({ settings }: RecordDisbursementFormProps) {
  const { id: currentUserId, name: currentUserName } = useCurrentUser();
  const recordDisbursement = useRecordDisbursement();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [driverId, setDriverId] = useState('');
  const [nurseName, setNurseName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

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

  useEffect(() => {
    if (settings?.defaultAmountPerSample) {
      setAmount(settings.defaultAmountPerSample);
    }
  }, [settings?.defaultAmountPerSample]);

  const selectedDriver = useMemo(() => drivers.find(d => d.id === driverId), [drivers, driverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !nurseName.trim() || !patientName.trim() || !amount || amount <= 0) {
      setError('Please fill all required fields');
      return;
    }

    setError(null);
    const amountValue = amount;
    const payload = {
      patientName: patientName.trim(),
      nurseId: '',
      nurseName: nurseName.trim(),
      driverId,
      driverName: selectedDriver?.name,
      amount: amountValue,
      currency: settings?.currency || 'USD',
      notes: notes || 'Venepuncture payment',
      createdByUserId: currentUserId,
      createdByUserName: currentUserName,
    };

    try {
      await recordDisbursement.mutateAsync(payload);

      // Reset form
      setPatientName('');
      setNurseName('');
      setDriverId('');
      setNotes('');
      setAmount(settings?.defaultAmountPerSample || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to record disbursement');
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
        <div>
          <label className="block text-sm font-medium mb-1">
            Patient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter patient name"
            className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
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


