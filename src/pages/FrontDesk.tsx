import React, { useState } from 'react';
import { Phone, Plus, UserPlus } from 'lucide-react';
import LogCallModal from '../components/frontdesk/LogCallModal';
import PendingRequestsTable from '../components/frontdesk/PendingRequestsTable';
import SampleCollectionsTable from '../components/frontdesk/SampleCollectionsTable';
import DashboardStats from '../components/frontdesk/DashboardStats';
import WalkInPatientModal from '../components/frontdesk/WalkInPatientModal';

export default function FrontDesk() {
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sampleRequests' | 'generalCalls'>('sampleRequests');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (tab: 'sampleRequests' | 'generalCalls') => {
    setActiveTab(tab);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Front Desk Dashboard</h1>
        <button
          onClick={() => setIsLogCallModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center"
        >
          <Phone className="w-4 h-4 mr-2" />
          Log New Call
        </button>
      </div>

      {/* Dynamic Stats Cards */}
      <DashboardStats />

      {/* Tabs and Call Button */}
      <div className="flex justify-between items-center border-b mb-6">
        <div className="flex">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'sampleRequests'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('sampleRequests')}
          >
            Sample Requests
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'generalCalls'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('generalCalls')}
          >
            General Calls
          </button>
        </div>
        
        {/* Log Call and Log Walk-in buttons side by side */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setIsLogCallModalOpen(true)}
            className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded-md text-sm font-medium hover:bg-primary-100 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Log Call
          </button>
          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-sm font-medium hover:bg-green-100 transition-colors flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Log Walk-in
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'sampleRequests' && <PendingRequestsTable key={`sample-${refreshKey}`} />}
        {activeTab === 'generalCalls' && <SampleCollectionsTable key={`general-${refreshKey}`} />}
      </div>

      {/* Log Call Modal */}
      <LogCallModal 
        isOpen={isLogCallModalOpen} 
        onClose={() => setIsLogCallModalOpen(false)} 
      />
      {/* Walk-in Patient Modal */}
      <WalkInPatientModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
      />
    </div>
  );
} 