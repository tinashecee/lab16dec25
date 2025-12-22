import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Requisition } from "../lib/firestore/inventory";
import FinalReceiptModal from "../components/inventory/FinalReceiptModal";
import { Loader2, AlertCircle } from "lucide-react";

export default function ConfirmReceipt() {
  const { requisitionId } = useParams<{ requisitionId: string }>();
  const navigate = useNavigate();
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (requisitionId) {
      fetchRequisition();
    }
  }, [requisitionId]);

  const fetchRequisition = async () => {
    try {
      setLoading(true);
      const requisitionRef = doc(db, "requisitions", requisitionId!);
      const requisitionDoc = await getDoc(requisitionRef);

      if (!requisitionDoc.exists()) {
        setError("Requisition not found");
        return;
      }

      const requisitionData = requisitionDoc.data() as Requisition;
      
      // Check if requisition is in the correct status for final receipt confirmation
      if (requisitionData.status !== "Delivered") {
        setError("This requisition is not ready for receipt confirmation. Current status: " + requisitionData.status);
        return;
      }

      setRequisition(requisitionData);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching requisition:", error);
      setError("Failed to load requisition details");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    navigate("/inventory");
  };

  const handleClose = () => {
    navigate("/inventory");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-600">Loading requisition details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/inventory")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Return to Inventory
          </button>
        </div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Requisition not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showModal && (
        <FinalReceiptModal
          requisition={requisition}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
