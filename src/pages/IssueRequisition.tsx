import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { getRequisition, issueRequisition, getProduct, Product } from '../lib/firestore/inventory';
import { Save, RefreshCw, AlertCircle, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function IssueRequisition() {
  const { requisitionId } = useParams();
  const navigate = useNavigate();
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [issuedQuantities, setIssuedQuantities] = useState<Record<string, number>>({});
  const [productDetails, setProductDetails] = useState<Record<string, Product>>({});
  const [receivedBy, setReceivedBy] = useState('');
  const [signature, setSignature] = useState<SignatureCanvas | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRequisition = async () => {
      if (requisitionId) {
        try {
          const req = await getRequisition(requisitionId);
          
          // Check if requisition exists
          if (!req) {
            setError('Requisition not found');
            return;
          }

          // Check requisition status
          if (req.status === 'Issued') {
            setError('This requisition has already been issued');
            return;
          }

          if (req.status !== 'Approved') {
            setError('This requisition is not approved for issuance');
            return;
          }

          setRequisition(req);
          // Initialize issued quantities with requested quantities
          const quantities: Record<string, number> = {};
          req.products.forEach(p => {
            quantities[p.productId] = p.requestedQuantity;
          });
          setIssuedQuantities(quantities);

          // Fetch product details to get available quantities
          const productDetailsMap: Record<string, Product> = {};
          await Promise.all(
            req.products.map(async (product) => {
              try {
                const productData = await getProduct(product.productId);
                if (productData) {
                  productDetailsMap[product.productId] = productData;
                }
              } catch (error) {
                console.error(`Error fetching product ${product.productId}:`, error);
              }
            })
          );
          setProductDetails(productDetailsMap);
        } catch (error) {
          console.error('Error loading requisition:', error);
          setError('Failed to load requisition details');
        } finally {
          setLoading(false);
        }
      }
    };

    loadRequisition();
  }, [requisitionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requisition || !signature || signature.isEmpty()) {
      alert('Please provide all required information including signature');
      return;
    }

    if (!receivedBy.trim()) {
      alert('Please enter who is receiving the items');
      return;
    }

    // Check for insufficient stock and warn user
    const insufficientStockProducts = requisition.products.filter(product => {
      const productData = productDetails[product.productId];
      if (!productData) return false;
      const issuedQty = issuedQuantities[product.productId] ?? product.requestedQuantity;
      return productData.quantity < issuedQty;
    });

    if (insufficientStockProducts.length > 0) {
      const shortageDetails = insufficientStockProducts.map(product => {
        const productData = productDetails[product.productId];
        const issuedQty = issuedQuantities[product.productId] ?? product.requestedQuantity;
        const shortage = issuedQty - (productData?.quantity || 0);
        return `${product.name}: Requesting ${issuedQty} ${product.unit}, Available ${productData?.quantity || 0} ${product.unit} (Shortage: ${shortage} ${product.unit})`;
      }).join('\n');

      const proceed = window.confirm(
        `WARNING: Insufficient stock for the following products:\n\n${shortageDetails}\n\n` +
        `You can still proceed with issuance, but stock levels will go negative.\n\n` +
        `Do you want to continue?`
      );

      if (!proceed) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const signatureImage = signature.toDataURL();
      
      // Prepare issued products data
      const issuedProducts = requisition.products.map(product => ({
        productId: product.productId,
        name: product.name,
        requestedQuantity: product.requestedQuantity,
        issuedQuantity: issuedQuantities[product.productId] ?? product.requestedQuantity,
        unit: product.unit
      }));

      // Validate quantities (only check for valid numbers, not stock availability)
      const invalidQuantities = issuedProducts.filter(
        product => 
          !product.issuedQuantity || 
          product.issuedQuantity <= 0 ||
          product.issuedQuantity > product.requestedQuantity
      );

      if (invalidQuantities.length > 0) {
        throw new Error(
          `Invalid quantities for:\n${invalidQuantities
            .map(p => `${p.name} (Requested: ${p.requestedQuantity})`)
            .join('\n')}`
        );
      }

      // Issue the requisition (will allow even with insufficient stock)
      await issueRequisition(requisition.id, {
        issuedProducts,
        receivedBy,
        signature: signatureImage,
        isDriver
      });

      if (isDriver) {
        // If driver, redirect to inventory handover flow
        alert('Requisition issued successfully. Proceeding to inventory handover.');
        navigate(`/inventory-handover/${requisition.id}`);
      } else {
        // If requester, process is complete
        alert('Requisition issued successfully and completed.');
        navigate('/app/inventory');
      }
    } catch (error) {
      console.error('Error issuing requisition:', error);
      alert(error instanceof Error ? error.message : 'Failed to issue requisition. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app/inventory')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Inventory</span>
        </button>

        {/* Header with Logo */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img 
                src="/images/logo.png" 
                alt="Laboratory Logo" 
                className="h-16 w-auto"
              />
             
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Dispatch No:</p>
              <p className="font-medium">{requisition?.dispatchNumber}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-red-700 mb-2">
                {error}
              </h2>
              <p className="text-sm text-red-600 mb-4">
                {error === 'Requisition not found' 
                  ? 'The requested requisition could not be found.'
                  : error === 'This requisition has already been issued'
                  ? 'This requisition has already been processed and issued.'
                  : 'This requisition needs to be approved before it can be issued.'}
              </p>
              <button
                onClick={() => navigate('/app/inventory')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Inventory
              </button>
            </div>
          ) : requisition && (
            <div>
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${requisition.status === 'Approved' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'}
                `}>
                  {requisition.status}
                </span>
              </div>

              {/* Requisition Details */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-medium">{requisition.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requested By</p>
                  <p className="font-medium">{requisition.requestedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Request Date</p>
                  <p className="font-medium">
                    {requisition.requestDate.toDate().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Products Section */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Products</h3>
                
                {/* Insufficient Stock Warning Banner */}
                {requisition.products.some(product => {
                  const productData = productDetails[product.productId];
                  if (!productData) return false;
                  const approvedQty = product.approvedQuantity || product.requestedQuantity;
                  return productData.quantity < approvedQty;
                }) && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-amber-800 mb-1">
                          Insufficient Stock Warning
                        </h3>
                        <p className="text-xs text-amber-700">
                          Some products have insufficient stock. You can still proceed with issuance, but stock levels may go negative. 
                          Please review the available quantities below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {requisition.products.map((product) => {
                    const productData = productDetails[product.productId];
                    const approvedQty = product.approvedQuantity || product.requestedQuantity;
                    const availableQty = productData?.quantity ?? 0;
                    const isInsufficient = availableQty < approvedQty;
                    
                    return (
                      <div key={product.productId} className={`flex items-center gap-4 p-4 rounded-lg ${
                        isInsufficient ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                      }`}>
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <div className="flex gap-4 mt-1 text-sm">
                            <p className="text-gray-600">Requested: {product.requestedQuantity} {product.unit}</p>
                            <p className="text-gray-600">Approved: {approvedQty} {product.unit}</p>
                            {productData && (
                              <p className={`font-medium ${
                                isInsufficient
                                  ? 'text-red-600'
                                  : availableQty < approvedQty * 1.2
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                              }`}>
                                Available: {availableQty} {product.unit}
                                {isInsufficient && (
                                  <span className="ml-1 text-xs">(Shortage: {approvedQty - availableQty} {product.unit})</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="w-32">
                          <label className="block text-sm text-gray-600">Issue Quantity</label>
                          <input
                            type="number"
                            value={issuedQuantities[product.productId]}
                            onChange={(e) => setIssuedQuantities({
                              ...issuedQuantities,
                              [product.productId]: Number(e.target.value)
                            })}
                            max={approvedQty}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                          {productData && isInsufficient && (
                            <p className="text-xs text-red-600 mt-1 font-medium">
                              Insufficient stock
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receiver Information */}
              <div className="mt-8">
                {/* Receiver Type Toggle */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Receiver Type
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="receiverType"
                        checked={!isDriver}
                        onChange={() => setIsDriver(false)}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Requester (Direct Receipt)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="receiverType"
                        checked={isDriver}
                        onChange={() => setIsDriver(true)}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Driver (Will Deliver to Requester)</span>
                    </label>
                  </div>
                  {isDriver && (
                    <p className="mt-2 text-sm text-gray-500">
                      Driver handover flow will be initiated after issuance.
                    </p>
                  )}
                  {!isDriver && (
                    <p className="mt-2 text-sm text-gray-500">
                      Process will be completed after issuance.
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    placeholder={isDriver ? "Enter driver name" : "Enter receiver name"}
                  />
                </div>

                {/* Signature Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signature
                  </label>
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={(ref) => setSignature(ref)}
                      canvasProps={{
                        className: 'w-full h-40 rounded-lg'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => signature?.clear()}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear Signature
                  </button>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Issue Requisition
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 