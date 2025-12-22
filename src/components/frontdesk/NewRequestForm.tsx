import React, { useState } from 'react';
import { Phone, MapPin, Clock, AlertCircle } from 'lucide-react';
import { collectionRequestService } from '../../services/collectionRequestService';

export default function NewRequestForm() {
  const [formData, setFormData] = useState({
    medicalCenter: {
      name: '',
      address: '',
      contactPerson: '',
      phoneNumber: ''
    },
    priority: 'Medium' as const,
    expectedPickupTime: '',
    notes: '',
    sampleDetails: {
      type: '',
      quantity: 1,
      specialHandling: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await collectionRequestService.createRequest(formData);
      setSuccess(true);
      setFormData({
        medicalCenter: {
          name: '',
          address: '',
          contactPerson: '',
          phoneNumber: ''
        },
        priority: 'Medium',
        expectedPickupTime: '',
        notes: '',
        sampleDetails: {
          type: '',
          quantity: 1,
          specialHandling: ''
        }
      });
    } catch (err) {
      setError('Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-secondary-900">New Collection Request</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Medical Center Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Medical Center Name
            </label>
            <input
              type="text"
              required
              value={formData.medicalCenter.name}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                medicalCenter: { ...prev.medicalCenter, name: e.target.value }
              }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          {/* Add other form fields... */}
          
          <div className="col-span-full">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Special Handling Instructions
            </label>
            <textarea
              value={formData.sampleDetails.specialHandling}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                sampleDetails: { ...prev.sampleDetails, specialHandling: e.target.value }
              }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            Request created successfully!
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => setFormData({
              medicalCenter: {
                name: '',
                address: '',
                contactPerson: '',
                phoneNumber: ''
              },
              priority: 'Medium',
              expectedPickupTime: '',
              notes: '',
              sampleDetails: {
                type: '',
                quantity: 1,
                specialHandling: ''
              }
            })}
            className="px-4 py-2 text-sm text-secondary-600 hover:text-secondary-700"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>
    </div>
  );
} 