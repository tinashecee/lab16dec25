import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, TestTube, Package } from "lucide-react";
import { TestMaterialMapping, MaterialRequirement } from "../../types/usageTracking";
import { getProducts } from "../../lib/firestore/inventory";
import { Product } from "../../lib/firestore/inventory";
import { addTestMaterialMapping, updateTestMaterialMapping } from "../../services/usageTrackingService";

interface TestMaterialMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: TestMaterialMapping | null;
}

export default function TestMaterialMappingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: TestMaterialMappingModalProps) {
  const [formData, setFormData] = useState({
    testId: "",
    testName: "",
    testCategory: "",
    materials: [] as MaterialRequirement[],
    isActive: true,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (initialData) {
        setFormData({
          testId: initialData.testId,
          testName: initialData.testName,
          testCategory: initialData.testCategory,
          materials: initialData.materials,
          isActive: initialData.isActive,
        });
      } else {
        setFormData({
          testId: "",
          testName: "",
          testCategory: "",
          materials: [],
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const loadProducts = async () => {
    try {
      const productsData = await getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          productId: "",
          productName: "",
          productCode: "",
          category: "",
          expectedQuantity: 0,
          unit: "",
          unitPrice: 0,
          isConsumable: true,
          notes: "",
        },
      ],
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => {
        if (i === index) {
          const updatedMaterial = { ...material, [field]: value };
          
          // Auto-populate product details when product is selected
          if (field === "productId" && value) {
            const selectedProduct = products.find(p => p.id === value);
            if (selectedProduct) {
              updatedMaterial.productName = selectedProduct.name;
              updatedMaterial.productCode = selectedProduct.code;
              updatedMaterial.category = selectedProduct.category;
              updatedMaterial.unitPrice = selectedProduct.unitPrice;
              updatedMaterial.unit = "pieces"; // Default unit, can be customized
            }
          }
          
          return updatedMaterial;
        }
        return material;
      }),
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.testId.trim()) {
      newErrors.testId = "Test ID is required";
    }

    if (!formData.testName.trim()) {
      newErrors.testName = "Test name is required";
    }

    if (!formData.testCategory.trim()) {
      newErrors.testCategory = "Test category is required";
    }

    if (formData.materials.length === 0) {
      newErrors.materials = "At least one material is required";
    }

    formData.materials.forEach((material, index) => {
      if (!material.productId) {
        newErrors[`material_${index}_product`] = "Product is required";
      }
      if (material.expectedQuantity <= 0) {
        newErrors[`material_${index}_quantity`] = "Expected quantity must be greater than 0";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (initialData) {
        await updateTestMaterialMapping(initialData.id, formData);
      } else {
        await addTestMaterialMapping({
          ...formData,
          createdBy: "current-user", // This should come from auth context
        });
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving test material mapping:", error);
      setErrors({ general: "Failed to save mapping. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <TestTube className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {initialData ? "Edit Test-Material Mapping" : "Create Test-Material Mapping"}
              </h2>
              <p className="text-sm text-gray-600">
                Define expected material usage for laboratory tests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Test Information */}
          <div className="space-y-4 mb-6">
            <h3 className="text-md font-medium text-gray-900">Test Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test ID *
                </label>
                <input
                  type="text"
                  value={formData.testId}
                  onChange={(e) => handleInputChange("testId", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.testId ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., CBC-001"
                />
                {errors.testId && (
                  <p className="mt-1 text-sm text-red-600">{errors.testId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name *
                </label>
                <input
                  type="text"
                  value={formData.testName}
                  onChange={(e) => handleInputChange("testName", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.testName ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., Complete Blood Count"
                />
                {errors.testName && (
                  <p className="mt-1 text-sm text-red-600">{errors.testName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Category *
              </label>
              <select
                value={formData.testCategory}
                onChange={(e) => handleInputChange("testCategory", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.testCategory ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="">Select category</option>
                <option value="Hematology">Hematology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Immunology">Immunology</option>
                <option value="Pathology">Pathology</option>
                <option value="Molecular">Molecular</option>
                <option value="Other">Other</option>
              </select>
              {errors.testCategory && (
                <p className="mt-1 text-sm text-red-600">{errors.testCategory}</p>
              )}
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium text-gray-900">Required Materials</h3>
              <button
                onClick={addMaterial}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>

            {errors.materials && (
              <p className="text-sm text-red-600">{errors.materials}</p>
            )}

            <div className="space-y-4">
              {formData.materials.map((material, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Material {index + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => removeMaterial(index)}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product *
                      </label>
                      <select
                        value={material.productId}
                        onChange={(e) => updateMaterial(index, "productId", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors[`material_${index}_product`] ? "border-red-300" : "border-gray-300"
                        }`}
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </option>
                        ))}
                      </select>
                      {errors[`material_${index}_product`] && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors[`material_${index}_product`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={material.expectedQuantity}
                        onChange={(e) => updateMaterial(index, "expectedQuantity", parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors[`material_${index}_quantity`] ? "border-red-300" : "border-gray-300"
                        }`}
                        placeholder="0.00"
                      />
                      {errors[`material_${index}_quantity`] && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors[`material_${index}_quantity`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={material.unit}
                        onChange={(e) => updateMaterial(index, "unit", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., pieces, ml, mg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={material.unitPrice}
                        onChange={(e) => updateMaterial(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consumable
                      </label>
                      <select
                        value={material.isConsumable ? "true" : "false"}
                        onChange={(e) => updateMaterial(index, "isConsumable", e.target.value === "true")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="true">Yes (consumed during test)</option>
                        <option value="false">No (reusable equipment)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={material.notes || ""}
                        onChange={(e) => updateMaterial(index, "notes", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {initialData ? "Update Mapping" : "Create Mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}
