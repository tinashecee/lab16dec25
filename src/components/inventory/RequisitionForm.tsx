import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Requisition } from '../../lib/firestore/inventory';

export default function RequisitionForm() {
  const { id } = useParams();
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequisition = async () => {
      try {
        if (!id) throw new Error('No requisition ID provided');
        
        const requisitionRef = doc(db, 'requisitions', id);
        const requisitionSnap = await getDoc(requisitionRef);
        
        if (!requisitionSnap.exists()) {
          throw new Error('Requisition not found');
        }

        setRequisition({ id: requisitionSnap.id, ...requisitionSnap.data() } as Requisition);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requisition');
      } finally {
        setLoading(false);
      }
    };

    fetchRequisition();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Requisition not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Requisition Details</h1>
        
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm text-gray-600">Department</label>
            <p className="font-medium">{requisition.department}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Requested By</label>
            <p className="font-medium">{requisition.requestedBy}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <p className="font-medium">{requisition.status}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Request Date</label>
            <p className="font-medium">
              {requisition.requestDate.toDate().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Products Table */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Requested Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requisition.products.map((product) => (
                  <tr key={product.productId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.requestedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 