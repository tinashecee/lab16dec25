import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, User, Phone, MapPin, Activity, CheckCircle, XCircle, History } from 'lucide-react';
import { DuplicatePatientSample, duplicatePatientService, AcknowledgedDuplicate } from '../../services/duplicatePatientService';
import { sampleCollectionService, SampleCollection } from '../../services/sampleCollectionService';
import SampleDetailsModal from '../dashboard/samples/SampleDetailsModal';

interface DuplicatePatientModalProps {
  duplicatePatients: DuplicatePatientSample[];
  onClose: () => void;
  onSampleCancelled: () => void;
  onDuplicatesAcknowledged?: () => void;
}

export default function DuplicatePatientModal({ 
  duplicatePatients, 
  onClose, 
  onSampleCancelled,
  onDuplicatesAcknowledged
}: DuplicatePatientModalProps) {
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleCollection | null>(null);
  const [showSampleDetails, setShowSampleDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [acknowledgedDuplicates, setAcknowledgedDuplicates] = useState<AcknowledgedDuplicate[]>([]);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [acknowledgeSuccess, setAcknowledgeSuccess] = useState<string | null>(null);

  const totalDuplicateSamples = duplicatePatients.reduce((total, patient) => total + patient.samples.length, 0);

  // Debug logging
  console.log('DuplicatePatientModal render - showCancelModal:', showCancelModal);

  // Load acknowledged duplicates when modal opens
  useEffect(() => {
    const loadAcknowledgedDuplicates = async () => {
      try {
        const acknowledged = await duplicatePatientService.getAcknowledgedDuplicates();
        setAcknowledgedDuplicates(acknowledged);
      } catch (error) {
        console.error('Error loading acknowledged duplicates:', error);
      }
    };

    loadAcknowledgedDuplicates();
  }, []);

  const handleAcknowledgeAndClose = async () => {
    setIsAcknowledging(true);
    try {
      // Acknowledge all current duplicates
      const acknowledgePromises = duplicatePatients.map(duplicate =>
        duplicatePatientService.acknowledgeDuplicate(duplicate)
      );
      
      await Promise.all(acknowledgePromises);
      console.log('All duplicates acknowledged successfully');
      
      // Refresh the acknowledged duplicates list
      const updatedAcknowledged = await duplicatePatientService.getAcknowledgedDuplicates();
      setAcknowledgedDuplicates(updatedAcknowledged);
      
      // Switch to history tab to show the newly acknowledged items
      setActiveTab('history');
      
      // Clear current duplicates since they've been acknowledged
      // Note: We don't close the modal immediately so user can see the history
      console.log(`Acknowledged ${duplicatePatients.length} duplicate patient groups. Switched to history tab.`);
      
      // Show success message
      setAcknowledgeSuccess(`Successfully acknowledged ${duplicatePatients.length} duplicate patient group(s). Check the History tab to view them.`);
      
      // Notify parent component that duplicates have been acknowledged
      if (onDuplicatesAcknowledged) {
        onDuplicatesAcknowledged();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setAcknowledgeSuccess(null), 5000);
      
    } catch (error) {
      console.error('Error acknowledging duplicates:', error);
      // Show error to user but don't close modal
      alert('Failed to acknowledge duplicates. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleSelectSample = (sampleId: string, checked: boolean) => {
    const newSelected = new Set(selectedSampleIds);
    if (checked) {
      newSelected.add(sampleId);
    } else {
      newSelected.delete(sampleId);
    }
    setSelectedSampleIds(newSelected);
  };

  const handleSampleClick = async (sampleId: string) => {
    try {
      console.log('Sample clicked:', sampleId);
      // Fetch the full sample details
      const sampleData = await sampleCollectionService.getSampleCollectionById(sampleId);
      if (sampleData) {
        console.log('Sample data fetched:', sampleData);
        setSelectedSample(sampleData);
        setShowSampleDetails(true);
      } else {
        console.warn('No sample data found for ID:', sampleId);
      }
    } catch (error) {
      console.error('Error fetching sample details:', error);
    }
  };

  const closeSampleDetails = () => {
    setShowSampleDetails(false);
    setSelectedSample(null);
  };

  const handleCancelSelected = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      // Cancel all selected samples
      const cancelPromises = Array.from(selectedSampleIds).map(sampleId =>
        sampleCollectionService.updateSampleCollection(sampleId, {
          status: 'cancelled',
          reason_for_cancellation: `Duplicate patient sample - ${cancelReason}`,
        })
      );

      await Promise.all(cancelPromises);

      // Reset states and close modal
      setSelectedSampleIds(new Set());
      setShowCancelModal(false);
      setCancelReason('');
      onSampleCancelled();
      onClose();
    } catch (error) {
      console.error('Error cancelling samples:', error);
      setCancelError('Failed to cancel samples. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'emergency':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 bg-yellow-50">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Duplicate Patient Samples Management
                  </h3>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'current' 
                      ? `${duplicatePatients.length} patient(s) have multiple samples drawn today (${totalDuplicateSamples} total samples)`
                      : `${acknowledgedDuplicates.length} previously acknowledged duplicate(s)`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setActiveTab('current')}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === 'current'
                    ? 'text-yellow-700 border-b-2 border-yellow-600 bg-yellow-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Current Duplicates ({duplicatePatients.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === 'history'
                    ? 'text-yellow-700 border-b-2 border-yellow-600 bg-yellow-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <History className="w-4 h-4" />
                  <span>History ({acknowledgedDuplicates.length})</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Success Message */}
            {acknowledgeSuccess && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-3" />
                  <span>{acknowledgeSuccess}</span>
                </div>
              </div>
            )}
            
            {activeTab === 'current' ? (
              <div className="space-y-6">
                {duplicatePatients.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Current Duplicates</h3>
                    <p className="text-gray-600">All duplicate patient samples have been resolved or acknowledged.</p>
                  </div>
                ) : (
                  duplicatePatients.map((patient, patientIndex) => (
                <div key={patientIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {/* Patient Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{patient.patientName}</h4>
                        {patient.patientPhone && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{patient.patientPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {patient.samples.length} samples today
                    </div>
                  </div>

                  {/* Samples List */}
                  <div className="space-y-3">
                    {patient.samples.map((sample, sampleIndex) => (
                      <div 
                        key={sample.id} 
                        className="bg-white rounded-md p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedSampleIds.has(sample.id)}
                              onChange={(e) => handleSelectSample(sample.id, e.target.checked)}
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            
                            {/* Sample Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSampleClick(sample.id);
                                  }}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer px-2 py-1 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                                >
                                  Sample #{sampleIndex + 1} - View Details
                                </button>
                                {sample.accession_number && (
                                  <span className="text-sm text-gray-600">
                                    (Accession: {sample.accession_number})
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                {/* Status */}
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${duplicatePatientService.getStatusColor(sample.status)}`}>
                                    {duplicatePatientService.getStatusDescription(sample.status)}
                                  </span>
                                </div>

                                {/* Priority */}
                                <div className="flex items-center space-x-2">
                                  {getPriorityIcon(sample.priority)}
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(sample.priority)}`}>
                                    {sample.priority.charAt(0).toUpperCase() + sample.priority.slice(1)}
                                  </span>
                                </div>

                                {/* Center */}
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{sample.center_name}</span>
                                </div>

                                {/* Requested Time */}
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{duplicatePatientService.formatDateTime(sample.requested_at)}</span>
                                </div>

                                {/* Collection Time */}
                                {sample.collected_at && (
                                  <div className="flex items-center space-x-2 text-gray-600">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Collected: {duplicatePatientService.formatDateTime(sample.collected_at)}</span>
                                  </div>
                                )}

                                {/* Tests */}
                                {sample.tests && sample.tests.length > 0 && (
                                  <div className="col-span-full">
                                    <span className="text-gray-600">Tests: </span>
                                    <span className="text-gray-900">{sample.tests.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                  ))
                )}
              </div>
            ) : (
              // History Tab
              <div className="space-y-6">
                {acknowledgedDuplicates.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No History</h3>
                    <p className="text-gray-600">No duplicate patient samples have been acknowledged yet.</p>
                  </div>
                ) : (
                  acknowledgedDuplicates.map((acknowledged, index) => (
                    <div key={acknowledged.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {/* Acknowledged Patient Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{acknowledged.patientName}</h4>
                            {acknowledged.patientPhone && (
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{acknowledged.patientPhone}</span>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Acknowledged: {duplicatePatientService.formatDateTime(acknowledged.acknowledgedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {acknowledged.sampleIds.length} samples
                        </div>
                      </div>
                      
                      {/* Sample IDs List */}
                      <div className="bg-white rounded-md p-3 border border-gray-200">
                        <div className="text-sm text-gray-600 mb-2">Sample IDs:</div>
                        <div className="flex flex-wrap gap-2">
                          {acknowledged.sampleIds.map((sampleId, sampleIndex) => (
                            <span 
                              key={sampleId}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              Sample {sampleIndex + 1}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {activeTab === 'current' && selectedSampleIds.size > 0 && (
                <span>{selectedSampleIds.size} sample(s) selected for cancellation</span>
              )}
            </div>
            <div className="flex space-x-3">
              {activeTab === 'current' ? (
                <>
                  <button
                    onClick={handleAcknowledgeAndClose}
                    disabled={isAcknowledging}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isAcknowledging ? 'Acknowledging...' : 'Acknowledge & Continue'}
                  </button>
                  {selectedSampleIds.size > 0 && (
                    <button
                      onClick={() => {
                        console.log('Cancel button clicked, setting showCancelModal to true');
                        console.log('Current showCancelModal state:', showCancelModal);
                        setShowCancelModal(true);
                        console.log('showCancelModal should now be true');
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Cancel Selected ({selectedSampleIds.size})
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center" style={{ zIndex: 9998 }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Cancel Selected Samples
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              You are about to cancel {selectedSampleIds.size} duplicate sample(s). 
              This action cannot be undone. Please provide a reason for the cancellation.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Duplicate sample - patient already has sample in progress"
              />
            </div>
            
            {cancelError && (
              <div className="mb-4 text-sm text-red-600">
                {cancelError}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setCancelError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isCancelling}
              >
                Cancel
              </button>
              <button
                onClick={handleCancelSelected}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Details Modal */}
      {showSampleDetails && selectedSample && (
        <div style={{ zIndex: 9999 }}>
          <SampleDetailsModal
            sample={selectedSample}
            onClose={closeSampleDetails}
            onRegisterSample={async () => {}} // Empty function since we don't need barcode scanning here
            onCancelled={() => {
              closeSampleDetails();
              onSampleCancelled(); // Refresh the parent component
            }}
          />
        </div>
      )}
    </>
  );
} 