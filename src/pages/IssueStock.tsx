import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { getProduct, updateProductQuantity } from '../lib/firestore/inventory';
import { Save, RefreshCw } from 'lucide-react';

export default function IssueStock() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [department, setDepartment] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [signature, setSignature] = useState<SignatureCanvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (productId) {
        try {
          const productData = await getProduct(productId);
          setProduct(productData);
        } catch (error) {
          console.error('Error loading product:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProduct();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !signature || signature.isEmpty()) return;

    setSubmitting(true);
    try {
      // Get signature as base64 image
      const signatureImage = signature.toDataURL();

      // Update product quantity
      await updateProductQuantity(product.id, product.quantity - quantity);

      // Save issue record with signature
      await saveIssueRecord({
        productId: product.id,
        quantity,
        department,
        issuedTo,
        signature: signatureImage,
        timestamp: new Date(),
      });

      // Show success message
      alert('Stock issued successfully');
      
      // Reset form
      setQuantity(1);
      setDepartment('');
      setIssuedTo('');
      signature.clear();
    } catch (error) {
      console.error('Error issuing stock:', error);
      alert('Failed to issue stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!product) {
    return <div className="p-4">Product not found</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Issue Stock</h1>
      
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="font-medium text-gray-900">{product.name}</h2>
        <p className="text-sm text-gray-600">Code: {product.code}</p>
        <p className="text-sm text-gray-600">Available: {product.quantity}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quantity to Issue
          </label>
          <input
            type="number"
            min="1"
            max={product.quantity}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Issued To
          </label>
          <input
            type="text"
            value={issuedTo}
            onChange={(e) => setIssuedTo(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signature
          </label>
          <div className="border border-gray-300 rounded-lg">
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

        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Issue Stock
          </button>
        </div>
      </form>
    </div>
  );
} 