import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, FileText, QrCode, Calendar, User, Building2, Package, CheckCircle, Clock, AlertCircle, Truck, ClipboardCheck, Send } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Requisition } from "../../lib/firestore/inventory";
import PDFPreviewModal from './PDFPreviewModal';
import { useAuth } from "../../hooks/useAuth";

interface ViewRequisitionModalProps {
  requisition: Requisition;
  onClose: () => void;
}

export default function ViewRequisitionModal({
  requisition,
  onClose,
}: ViewRequisitionModalProps) {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const navigate = useNavigate();
  const { userData } = useAuth();
  const isAccountsClerk = userData?.role === "Accounts Clerk";


  // Helper function to get requested quantity with fallback
  const getRequestedQuantity = (product: any) => {
    return product.requestedQuantity || product.quantity || 0;
  };

  // Generate QR code value based on status
  const getQRCodeValue = (): string | null => {
    const baseUrl = window.location.origin;
    switch (requisition.status) {
      case 'Issued':
        return `${baseUrl}/inventory-handover/${requisition.id}`;
      case 'Delivered':
        // Delivered is the final status, no QR code needed
        return null;
      default:
        return `${baseUrl}/issue-requisition/${requisition.id}`;
    }
  };
  
  const qrValue = getQRCodeValue();

  // Get status icon and color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'Rejected':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      case 'Issued':
        return { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'Delivered':
        return { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
      case 'Completed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      default:
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    }
  };

  const statusConfig = getStatusConfig(requisition.status);
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 text-white">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Requisition Details</h2>
                  <p className="text-primary-100 mt-1">#{requisition.dispatchNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAccountsClerk && requisition.status === "Approved" && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/issue-requisition/${requisition.id}`);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Issue Requisition
                  </button>
                )}
                <button
                  onClick={() => setShowPDFPreview(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">

                {/* Status Card */}
                <div className={`p-6 rounded-xl border-2 ${statusConfig.bg} ${statusConfig.border}`}>
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    <div>
                      <h3 className="font-semibold text-gray-900">Status</h3>
                      <p className={`text-lg font-bold ${statusConfig.color}`}>{requisition.status}</p>
                    </div>
                  </div>
                </div>

                {/* Requisition Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Department</h3>
                    </div>
                    <p className="text-lg font-medium text-gray-700">{requisition.department}</p>
                  </div>
                  
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Requested By</h3>
                    </div>
                    <p className="text-lg font-medium text-gray-700">{requisition.requestedBy}</p>
                  </div>
                  
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Request Date</h3>
                    </div>
                    <p className="text-lg font-medium text-gray-700">
                      {requisition.requestDate.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Total Items</h3>
                    </div>
                    <p className="text-lg font-medium text-gray-700">{requisition.products.length} products</p>
                  </div>
                </div>

                {/* Products Section */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Products ({requisition.products.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                          {(requisition.status === 'Confirmed' || requisition.status === 'Approved' || requisition.status === 'Issued') && (
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                          )}
                          {requisition.status === 'Issued' && (
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Issued</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {requisition.products.map((product, index) => (
                          <tr key={product.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getRequestedQuantity(product)} {product.unit}
                              </span>
                            </td>
                            {(requisition.status === 'Confirmed' || requisition.status === 'Approved' || requisition.status === 'Issued') && (
                              <td className="px-6 py-4 text-sm text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  product.approvedQuantity !== getRequestedQuantity(product)
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {product.approvedQuantity || getRequestedQuantity(product)} {product.unit}
                                </span>
                                {product.approvalNotes && (
                                  <p className="text-xs text-gray-500 mt-1 italic">{product.approvalNotes}</p>
                                )}
                              </td>
                            )}
                            {requisition.status === 'Issued' && requisition.issuedProducts && (
                              <td className="px-6 py-4 text-sm text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  (requisition.issuedProducts.find(p => p.productId === product.productId)?.issuedQuantity || 0) < 
                                    (product.approvedQuantity || getRequestedQuantity(product))
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {requisition.issuedProducts.find(p => p.productId === product.productId)?.issuedQuantity || 0} {product.unit}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Approval Section */}
                {requisition.status !== 'Pending' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Approval Details
                    </h3>
                    
                    {/* Timeline */}
                    <div className="mb-6">
                      <div className="relative space-y-4">
                        {/* Requisition Created */}
                        <div className="relative flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="rounded-full p-2 bg-blue-100 text-blue-600 shadow-sm">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="w-0.5 mt-2 bg-blue-300" style={{ height: "24px" }}></div>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="text-sm font-medium text-gray-900">Requisition Created</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {requisition.createdAt?.toDate ? requisition.createdAt.toDate().toLocaleString() : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">By {requisition.requestedBy}</div>
                          </div>
                        </div>

                        {/* Confirmed */}
                        {requisition.confirmedBy && requisition.confirmedAt && (
                          <div className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full p-2 bg-green-100 text-green-600 shadow-sm">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              {requisition.approvedBy || requisition.issuedBy || requisition.driverReceivedBy ? (
                                <div className="w-0.5 mt-2 bg-green-300" style={{ height: "24px" }}></div>
                              ) : null}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="text-sm font-medium text-gray-900">Confirmed</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {requisition.confirmedAt?.toDate ? requisition.confirmedAt.toDate().toLocaleString() : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">By {requisition.confirmedBy}</div>
                              {requisition.approver1Comments && (
                                <div className="text-xs text-gray-500 mt-1 italic">"{requisition.approver1Comments}"</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Approved */}
                        {requisition.approvedBy && requisition.approvedAt && (
                          <div className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full p-2 bg-blue-100 text-blue-600 shadow-sm">
                                <ClipboardCheck className="w-4 h-4" />
                              </div>
                              {requisition.issuedBy || requisition.driverReceivedBy ? (
                                <div className="w-0.5 mt-2 bg-blue-300" style={{ height: "24px" }}></div>
                              ) : null}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="text-sm font-medium text-gray-900">Approved</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {requisition.approvedAt?.toDate ? requisition.approvedAt.toDate().toLocaleString() : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">By {requisition.approvedBy}</div>
                              {requisition.approver2Comments && (
                                <div className="text-xs text-gray-500 mt-1 italic">"{requisition.approver2Comments}"</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Issued */}
                        {requisition.issuedBy && requisition.issuedAt && (
                          <div className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full p-2 bg-purple-100 text-purple-600 shadow-sm">
                                <Package className="w-4 h-4" />
                              </div>
                              {requisition.driverReceivedBy ? (
                                <div className="w-0.5 mt-2 bg-purple-300" style={{ height: "24px" }}></div>
                              ) : null}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="text-sm font-medium text-gray-900">Issued</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {requisition.issuedAt?.toDate ? requisition.issuedAt.toDate().toLocaleString() : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">By {requisition.issuedBy}</div>
                              {requisition.issuanceNotes && (
                                <div className="text-xs text-gray-500 mt-1 italic">"{requisition.issuanceNotes}"</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Delivered */}
                        {requisition.driverReceivedBy && requisition.driverReceivedAt && (
                          <div className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full p-2 bg-green-100 text-green-600 shadow-sm">
                                <Truck className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">Delivered</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {requisition.driverReceivedAt?.toDate ? requisition.driverReceivedAt.toDate().toLocaleString() : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">Received by {requisition.driverReceivedBy}</div>
                              {requisition.driverHandoverNotes && (
                                <div className="text-xs text-gray-500 mt-1 italic">"{requisition.driverHandoverNotes}"</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Rejected */}
                        {requisition.status === 'Rejected' && requisition.rejectedBy && requisition.rejectedAt && (
                          <div className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="rounded-full p-2 bg-red-100 text-red-600 shadow-sm">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-900">Rejected</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {requisition.rejectedAt?.toDate ? requisition.rejectedAt.toDate().toLocaleString() : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">By {requisition.rejectedBy}</div>
                              {requisition.rejectionReason && (
                                <div className="text-xs text-red-600 mt-1 font-medium">"{requisition.rejectionReason}"</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <QrCode className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Quick Access</h3>
                    </div>
                    
                    {qrValue ? (
                      <>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <QRCodeSVG
                        value={qrValue}
                        size={180}
                        level="H"
                        includeMargin
                        className="mx-auto"
                      />
                    </div>
                    
                        <div className="space-y-3 text-sm mb-4">
                      <div className={`p-3 rounded-lg ${
                        requisition.status === 'Issued' ? 'bg-blue-50' :
                        'bg-blue-50'
                      }`}>
                        <p className={`font-medium ${
                          requisition.status === 'Issued' ? 'text-blue-900' :
                          'text-blue-900'
                        }`}>
                              {requisition.status === 'Issued' ? 'Inventory Handover' :
                           'Scan to Access'}
                        </p>
                        <p className={`text-xs mt-1 ${
                          requisition.status === 'Issued' ? 'text-blue-700' :
                          'text-blue-700'
                        }`}>
                              {requisition.status === 'Issued' ? 'Recipient can scan this QR code to confirm inventory handover' :
                           'Use your phone camera to scan this QR code for quick access to this requisition'}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : requisition.status === 'Delivered' ? (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="font-medium text-green-900">Delivery Completed</p>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          This requisition has been successfully delivered. No further action is required.
                        </p>
                      </div>
                    ) : null}
                      
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">Requisition ID</p>
                        <p className="text-gray-600 font-mono text-xs mt-1 break-all">
                          {requisition.dispatchNumber}
                        </p>
                      </div>
                      
                      {qrValue && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">Direct Link</p>
                        <p className="text-gray-600 text-xs mt-1 break-all">
                          {qrValue}
                        </p>
                      </div>
                      )}
                    </div>
                    
                    {qrValue && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        This QR code provides instant access to the requisition details and can be used for tracking and verification purposes.
                      </p>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPDFPreview && (
        <PDFPreviewModal
          requisition={requisition}
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </>
  );
}
