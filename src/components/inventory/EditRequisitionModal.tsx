import React from "react";
import { X } from "lucide-react";
import { Requisition, updateRequisition } from "../../lib/firestore/inventory";
import NewRequisitionModal from "./NewRequisitionModal";

interface EditRequisitionModalProps {
  requisition: Requisition;
  onClose: () => void;
  onSave: () => void;
}

export default function EditRequisitionModal({
  requisition,
  onClose,
  onSave,
}: EditRequisitionModalProps) {
  // We can reuse the NewRequisitionModal with pre-filled data
  return (
    <NewRequisitionModal
      onClose={onClose}
      initialData={requisition}
      onSave={onSave}
    />
  );
}
