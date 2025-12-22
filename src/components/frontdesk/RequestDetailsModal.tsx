import { 
  X, Clock, AlertCircle, FileText, Download,
  CheckCircle2, XCircle, Truck, MapPin, Phone, User
} from 'lucide-react';
import { CollectionRequest } from '@/lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState } from 'react';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CollectionRequest | null;
}

function getStatusColor(status: string) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    'accepted collection': 'bg-blue-100 text-blue-800',
    collected: 'bg-green-100 text-green-800',
    registered: 'bg-purple-100 text-purple-800',
    received: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-200 text-green-900',
    delivered: 'bg-blue-200 text-blue-900',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-yellow-100 text-yellow-800';
    case 'emergency':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-green-100 text-green-800';
  }
}

const generateRequestReport = (request: CollectionRequest) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text('Collection Request Report', 105, 15, { align: 'center' });
  
  // Add request basic info
  doc.setFontSize(12);
  doc.text(`Request ID: ${request.id}`, 20, 30);
  doc.text(`Sample ID: ${request.sample_id || 'N/A'}`, 20, 37);
  doc.text(`Collection Center: ${request.center_name}`, 20, 44);
  doc.text(`Status: ${request.status.toUpperCase()}`, 20, 51);
  doc.text(`Priority: ${request.priority.toUpperCase()}`, 20, 58);
  doc.text(`Requested At: ${new Date(request.requested_at).toLocaleString()}`, 20, 65);
  
  if (request.assigned_driver) {
    doc.text(`Assigned Driver: ${request.assigned_driver.name}`, 20, 72);
  }
  
  // Add caller information table
  doc.setFontSize(14);
  doc.text('Contact Information', 20, 85);
  
  const contactData = [
    ['Caller Name', request.caller_name || 'N/A'],
    ['Caller Number', request.caller_number || 'N/A'],
    ['Center Address', request.center_address || 'N/A'],
    ['Notes', request.notes || 'N/A']
  ];
  
  autoTable(doc, {
    startY: 90,
    head: [['Field', 'Value']],
    body: contactData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });
  
  // Save the PDF
  doc.save(`collection-request-${request.id}.pdf`);
};

export default function RequestDetailsModal({ isOpen, onClose, request }: RequestDetailsModalProps) {
  // Set the default active tab to 'details' instead of 'document'
  const [activeTab, setActiveTab] = useState<'details' | 'document'>('details');
  
  if (!isOpen || !request) return null;

  // Check if document field exists
  const hasDocument = request.document && typeof request.document === 'string';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-6xl rounded-lg bg-white p-6 shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Collection Request - {request.sample_id || request.id}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {request.center_name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => generateRequestReport(request)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tab Navigation - Reordered so Details comes first */}
          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'details' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Request Details
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'document' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('document')}
            >
              Request Form
            </button>
          </div>

          {/* Content */}
          <div className="min-h-[400px]">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Request Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">ID:</span>
                        <span className="ml-2 font-medium">{request.id}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Sample ID:</span>
                        <span className="ml-2 font-medium">{request.sample_id || 'Not assigned'}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Requested:</span>
                        <span className="ml-2 font-medium">
                          {new Date(request.requested_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Status:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Priority:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {request.priority.toUpperCase()}
                        </span>
                      </div>
                      {request.assigned_driver && (
                        <div className="flex items-center text-sm">
                          <Truck className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Driver:</span>
                          <span className="ml-2 font-medium">
                            {request.assigned_driver.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Notes</h4>
                      <p className="text-sm text-gray-600">{request.notes}</p>
                    </div>
                  )}
                </div>

                {/* Right Column - Center & Contact Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Collection Center</h4>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{request.center_name}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Address:</span>
                        <span className="ml-2 font-medium">{request.center_address || 'N/A'}</span>
                      </div>
                      {request.center_coordinates?.lat && request.center_coordinates?.lng && (
                        <div className="mt-2">
                          <div className="h-40 bg-gray-200 rounded-lg overflow-hidden">
                            <iframe
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${request.center_coordinates.lat},${request.center_coordinates.lng}`}
                              allowFullScreen
                            ></iframe>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Contact Name:</span>
                        <span className="ml-2 font-medium">{request.caller_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Phone Number:</span>
                        <span className="ml-2 font-medium">{request.caller_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'document' && (
              <div className="h-full">
                {hasDocument ? (
                  // Document preview - assuming it's a URL to a PDF or image
                  <div className="h-[70vh] bg-gray-100 rounded-lg overflow-hidden">
                    <iframe 
                      src={request.document} 
                      className="w-full h-full" 
                      title="Request Form Document"
                    />
                  </div>
                ) : (
                  // No document available
                  <div className="flex flex-col items-center justify-center h-[50vh] bg-gray-50 rounded-lg">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Document Available</h3>
                    <p className="text-sm text-gray-500 text-center max-w-md">
                      The request form document has not been uploaded by the driver yet.
                      Documents are typically uploaded after collection.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 