import React, { useState } from "react";
import { Package, FileSpreadsheet, Plus, Search, BarChart3 } from "lucide-react";
import ProductsList from "../components/inventory/ProductsList.tsx";
import RequisitionsList from "../components/inventory/RequisitionsList.tsx";
import ApprovalsList from "../components/inventory/ApprovalsList.tsx";
import UsageTracking from "../components/inventory/UsageTracking.tsx";
import SearchBar from "../components/common/SearchBar.tsx";
import NewProductModal from "../components/inventory/NewProductModal.tsx";

type InventoryTab = "products" | "requisitions" | "approvals" | "usage-tracking";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<InventoryTab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  const tabs = [
    { id: "products", label: "Products", icon: Package },
    { id: "requisitions", label: "Requisitions", icon: FileSpreadsheet },
    { id: "approvals", label: "Approvals", icon: FileSpreadsheet },
    { id: "usage-tracking", label: "Usage Tracking", icon: BarChart3 },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Inventory Management
          </h1>
          <p className="text-secondary-600">
            Manage products, requisitions, and approvals
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as InventoryTab)}
                  className={`
                    py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-gray-300"
                    }
                  `}>
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="w-72">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${activeTab}...`}
            />
          </div>

          {activeTab === "products" && (
            <button
              onClick={() => setIsNewProductModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200">
          {activeTab === "products" && (
            <ProductsList searchQuery={searchQuery} />
          )}
          {activeTab === "requisitions" && (
            <RequisitionsList searchQuery={searchQuery} />
          )}
          {activeTab === "approvals" && (
            <ApprovalsList searchQuery={searchQuery} />
          )}
          {activeTab === "usage-tracking" && (
            <UsageTracking searchQuery={searchQuery} />
          )}
        </div>
      </div>

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <NewProductModal onClose={() => setIsNewProductModalOpen(false)} />
      )}
    </div>
  );
}
