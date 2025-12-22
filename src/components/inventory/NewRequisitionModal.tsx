import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Search, ChevronDown } from "lucide-react";
import {
  addRequisition,
  updateRequisition,
  Requisition,
  getProducts,
  Product,
} from "../../lib/firestore/inventory";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { departmentService } from "../../services/departmentService";

interface NewRequisitionModalProps {
  onClose: () => void;
  initialData?: Requisition;
  onSave?: () => void;
}

interface ProductEntry {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function NewRequisitionModal({
  onClose,
  initialData,
  onSave,
}: NewRequisitionModalProps) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [formData, setFormData] = useState({
    requestDate: initialData
      ? initialData.requestDate.toDate().toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    department: userData?.department || "",
    comments: initialData?.comments || "",
  });

  const [products, setProducts] = useState<ProductEntry[]>(
    initialData
      ? initialData.products.map((p) => ({
          id: p.productId,
          name: p.name,
          quantity: p.requestedQuantity,
          unit: p.unit,
        }))
      : []
  );

  const [currentProduct, setCurrentProduct] = useState<{
    id: string;
    name: string;
    code: string;
    quantity: number;
    unit: string;
  }>({
    id: "",
    name: "",
    code: "",
    quantity: 1,
    unit: "pieces",
  });

  const [showProductError, setShowProductError] = useState(false);

  // Fetch departments and products from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData.map((dept) => dept.name));

        // Fetch products
        const productsData = await getProducts();
        setAvailableProducts(productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const units = ["pieces", "boxes", "pairs", "packs", "grams", "milliliters"];

  // Filter products based on search query
  const filteredProducts = availableProducts.filter((product) =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const handleAddProduct = () => {
    if (!currentProduct.id || !currentProduct.name) {
      setShowProductError(true);
      return;
    }

    if (currentProduct.quantity > 0) {
      setProducts([
        ...products,
        {
          id: currentProduct.id,
          name: currentProduct.name,
          quantity: currentProduct.quantity,
          unit: currentProduct.unit,
        },
      ]);
      setCurrentProduct({
        id: "",
        name: "",
        code: "",
        quantity: 1,
        unit: "pieces",
      });
      setProductSearchQuery("");
      setShowProductDropdown(false);
      setShowProductError(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setCurrentProduct({
      id: product.id,
      name: product.name,
      code: product.code,
      quantity: 1,
      unit: "pieces",
    });
    setProductSearchQuery(product.name);
    setShowProductDropdown(false);
    setSelectedProductIndex(-1);
    setShowProductError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showProductDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedProductIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedProductIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedProductIndex >= 0 && filteredProducts[selectedProductIndex]) {
          handleProductSelect(filteredProducts[selectedProductIndex]);
        }
        break;
      case 'Escape':
        setShowProductDropdown(false);
        setSelectedProductIndex(-1);
        break;
    }
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (products.length === 0) {
      alert("Please add at least one product to the requisition");
      return;
    }

    setLoading(true);
    try {
      const requisitionData = {
        requestDate: Timestamp.fromDate(new Date(formData.requestDate)),
        department: userData?.department || "",
        products: products.map((p) => ({
          productId: p.id,
          name: p.name,
          requestedQuantity: p.quantity,
          unit: p.unit,
        })),
        status: "Pending" as const,
        requestedBy: userData?.name || "",
        requesterEmail: userData?.email || "",
        comments: formData.comments,
      };

      if (initialData) {
        // Update existing requisition
        await updateRequisition(initialData.id, requisitionData);
      } else {
        // Create new requisition
        await addRequisition(requisitionData);
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error("Error saving requisition:", error);
      alert("Failed to save requisition. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-secondary-900">
            {initialData ? "Edit Requisition" : "New Stock Requisition"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={userData?.department || ""}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Request Date
              </label>
              <input
                type="date"
                value={formData.requestDate}
                onChange={(e) =>
                  setFormData({ ...formData, requestDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="relative product-dropdown-container">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Product
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                      setSelectedProductIndex(-1);
                      setShowProductError(false);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products..."
                    className={`w-full px-3 py-2 pr-10 rounded-lg border ${
                      showProductError ? "border-red-500" : "border-gray-200"
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  
                  {/* Dropdown */}
                  {showProductDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product, index) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                              index === selectedProductIndex 
                                ? 'bg-primary-50 border-primary-200' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-gray-500">
                              Code: {product.code} | Category: {product.category}
                            </div>
                            <div className="text-xs text-gray-500">
                              Available: {product.quantity} | Price: ${product.unitPrice.toFixed(2)}
                            </div>
                            {product.quantity === 0 && (
                              <div className="text-xs text-red-500 font-medium">
                                Out of Stock
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {productSearchQuery ? 'No products found matching your search' : 'No products available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {showProductError && (
                  <p className="mt-1 text-sm text-red-500">
                    Please select a product
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={currentProduct.quantity}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Unit
                </label>
                <select
                  value={currentProduct.unit}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      unit: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddProduct}
              className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          {/* Products Table */}
          {products.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Serial No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 text-sm text-secondary-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-900">
                        {product.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-900">
                        {product.unit}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Comments
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700"
              }`}>
              {loading
                ? "Saving..."
                : initialData
                ? "Save Changes"
                : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
