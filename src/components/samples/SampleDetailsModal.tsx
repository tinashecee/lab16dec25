import { 
  X, Clock, CheckCircle2, AlertCircle, Timer, Beaker, User, Building2, FileText,
  CheckCircle, XCircle, Truck, ClipboardCheck, Package, TestTube, Bell, Send, Download
} from 'lucide-react';
import { Sample, TestDetail, TimelineEvent } from '../../services/sampleService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateCAT } from '../../utils/timeUtils';

interface SampleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: Sample | null;
}

function getTestStatusColor(status: TestDetail['status']) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'not_started':
      return 'bg-red-100 text-red-800';
  }
}

function getTimeLapsed(startTime: string, endTime?: string) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const timeLapsed = end.getTime() - start.getTime();
  const hours = Math.floor(timeLapsed / (60 * 60 * 1000));
  const minutes = Math.floor((timeLapsed % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

function getTimelineIcon(type: TimelineEvent['type']) {
  switch (type) {
    case 'request':
      return <ClipboardCheck className="h-5 w-5 text-blue-500" />;
    case 'driver_assigned':
      return <Truck className="h-5 w-5 text-yellow-500" />;
    case 'collection':
      return <Package className="h-5 w-5" />;
    case 'registration':
      return <FileText className="h-5 w-5" />;
    case 'received':
      return <CheckCircle className="h-5 w-5" />;
    case 'test_completed':
      return <TestTube className="h-5 w-5" />;
    case 'all_tests_completed':
      return <CheckCircle2 className="h-5 w-5" />;
    case 'driver_notified':
      return <Bell className="h-5 w-5" />;
    case 'delivered':
      return <Send className="h-5 w-5" />;
    case 'canceled':
      return <XCircle className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
}

function getTimelineEventColor(event: TimelineEvent) {
  if (event.status === 'canceled') return 'text-red-500';
  switch (event.type) {
    case 'request':
      return 'text-blue-500';
    case 'driver_assigned':
      return 'text-yellow-500';
    case 'collection':
      return 'text-yellow-500';
    case 'registration':
      return 'text-purple-500';
    case 'received':
      return 'text-purple-500';
    case 'test_completed':
      return 'text-green-400';
    case 'all_tests_completed':
      return 'text-green-600';
    case 'driver_notified':
    case 'delivered':
      return 'text-blue-600';
    default:
      return 'text-gray-500';
  }
}

const generateSampleReport = (sample: Sample) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text('Sample Status Report', 105, 15, { align: 'center' });
  
  // Add sample basic info
  doc.setFontSize(12);
  doc.text(`Sample ID: ${sample.id}`, 20, 30);
  doc.text(`Patient: ${sample.patientName}`, 20, 37);
  doc.text(`Accession #: ${sample.accessionNumber}`, 20, 44);
  doc.text(`Collection Center: ${sample.collectionCenter}`, 20, 51);
  doc.text(`Status: ${sample.status.toUpperCase()}`, 20, 58);
  doc.text(`Tests Completed: ${sample.completedTestsCount}/${sample.totalTestsCount}`, 20, 65);
  
  // Add timeline table
  doc.setFontSize(14);
  doc.text('Timeline', 20, 80);
  
  const timelineData = sample.timeline.map(event => [
    formatDateCAT(event.timestamp),
    event.type.replace(/_/g, ' ').toUpperCase(),
    event.details,
    event.actor || ''
  ]);
  
  autoTable(doc, {
    startY: 85,
    head: [['Timestamp', 'Event', 'Details', 'Actor']],
    body: timelineData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });
  
  // Add test details table
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.text('Test Details', 20, finalY + 15);
  
  const testData = sample.tests.map(test => [
    test.name,
    test.status.replace(/_/g, ' ').toUpperCase(),
    test.startedAt ? formatDateCAT(test.startedAt) : '-',
    test.completedAt ? formatDateCAT(test.completedAt) : '-',
    test.results || '-',
    test.notes || '-'
  ]);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Test Name', 'Status', 'Started At', 'Completed At', 'Results', 'Notes']],
    body: testData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });
  
  // Save the PDF
  doc.save(`sample-report-${sample.id}.pdf`);
};

export default function SampleDetailsModal({ isOpen, onClose, sample }: SampleDetailsModalProps) {
  if (!isOpen || !sample) return null;

  try {
    // Add default values for tests if they don't exist
    const tests = sample.tests || [];
    const completedTests = tests.filter(test => test.status === 'completed').length;
    const totalTests = tests.length;

    // Create initial timeline events if they don't exist
    const allTimelineEvents = [
      // Always add the request event
      {
        id: 'request',
        type: 'request' as const,
        timestamp: sample.requestedAt,
        details: 'Sample collection requested',
        actor: sample.requestedBy || undefined
      },
      // Add driver assignment if driverName exists
      ...(sample.driverName ? [{
        id: 'driver_assigned',
        type: 'driver_assigned' as const,
        timestamp: sample.driverAssignedAt || sample.requestedAt, // fallback to requestedAt if no specific time
        details: `Driver ${sample.driverName} assigned`,
        actor: sample.driverName
      }] : []),
      // Add existing timeline events
      ...(sample.timeline || [])
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-6xl rounded-lg bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Sample Details. - {sample.id}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {sample.status === 'pending' ? 'Pending Collection' : `${completedTests} of ${totalTests} tests completed`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {sample.status !== 'pending' && (
                  <button
                    onClick={() => generateSampleReport(sample)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Basic Info */}
              <div className="col-span-3 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Sample Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">ID:</span>
                      <span className="ml-2 font-medium">{sample.id}</span>
                    </div>
                    {sample.patientName && (
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Patient:</span>
                        <span className="ml-2 font-medium">{sample.patientName}</span>
                      </div>
                    )}
                    {sample.collectionCenter && (
                      <div className="flex items-center text-sm">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Collection Center:</span>
                        <span className="ml-2 font-medium">{sample.collectionCenter}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Priority:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium
                        ${sample.priority === 'urgent' ? 'bg-red-100 text-red-800' : 
                          sample.priority === 'stat' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}`}>
                        {sample.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Requested:</span>
                      <span className="ml-2 font-medium">
                        {formatDateCAT(sample.requestedAt)}
                      </span>
                    </div>
                    {sample.driverName && (
                      <div className="flex items-center text-sm">
                        <Truck className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Driver:</span>
                        <span className="ml-2 font-medium">
                          {sample.driverName}
                          {sample.driverAssignedAt && (
                            <span className="text-xs text-gray-500 ml-1">
                              (assigned {formatDateCAT(sample.driverAssignedAt)})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {tests.length > 0 && (
                      <div className="flex items-center text-sm">
                        <Timer className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Tests Completed:</span>
                        <span className="ml-2 font-medium">
                          {completedTests}/{totalTests}
                        </span>
                      </div>
                    )}
                    {sample.collectedBy && (
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Collected by:</span>
                        <span className="ml-2 font-medium">{sample.collectedBy}</span>
                      </div>
                    )}
                    {sample.processedBy && (
                      <div className="flex items-center text-sm">
                        <Beaker className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Processed by:</span>
                        <span className="ml-2 font-medium">{sample.processedBy}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      {sample.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                      )}
                      <span className="capitalize text-sm font-medium">
                        {sample.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {completedTests} of {totalTests} tests completed
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Timeline */}
              <div className="col-span-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Timeline</h4>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-2.5 top-0 h-full w-px bg-gray-200" />

                    <div className="space-y-6">
                      {allTimelineEvents.map((event, index) => {
                        // For test completion events, calculate the number of completed tests at this point
                        let completionText = event.details;
                        if (event.type === 'test_completed') {
                          const completedCount = allTimelineEvents
                            .filter(e => e.type === 'test_completed' && e.timestamp <= event.timestamp)
                            .length;
                          completionText = `Test Completed (${completedCount}/${totalTests})`;
                        }

                        return (
                          <div key={event.id || index} className="relative flex gap-3">
                            {/* Icon */}
                            <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-gray-300 ${getTimelineEventColor(event)}`}>
                              {getTimelineIcon(event.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {completionText}
                                  </p>
                                  {event.actor && (
                                    <p className="text-xs text-gray-500">
                                      by {event.actor}
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {formatDateCAT(event.timestamp)}
                                </p>
                              </div>
                              {event.status === 'canceled' && (
                                <p className="mt-1 text-xs text-red-500 font-medium">
                                  Canceled
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Test Details */}
              {tests.length > 0 && (
                <div className="col-span-5">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Test Details</h4>
                    <div className="space-y-4">
                      {tests.map((test) => (
                        <div key={test.id} className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="text-sm font-medium">{test.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${getTestStatusColor(test.status)}`}>
                                  {test.status === 'completed' ? (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Completed</span>
                                    </div>
                                  ) : test.status === 'in_progress' ? (
                                    <div className="flex items-center gap-1">
                                      <Timer className="h-3 w-3" />
                                      <span>In Progress</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>Not Started</span>
                                    </div>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>Target: {test.targetTAT}h</span>
                              </div>
                              {test.startedAt && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Time Elapsed: {getTimeLapsed(test.startedAt, test.completedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                          {test.results && (
                            <div className="mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Beaker className="h-3 w-3" />
                                <span>Results: {test.results}</span>
                              </div>
                            </div>
                          )}
                          {test.notes && (
                            <div className="mt-1 text-xs text-gray-500">
                              Notes: {test.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering modal:', error);
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-6xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-red-600">
              Error displaying sample details
            </h3>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
}
