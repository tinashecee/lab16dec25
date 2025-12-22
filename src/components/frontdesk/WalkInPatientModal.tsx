import React, { useState, useEffect, useRef } from "react";
import { X, UserPlus, Scan, Truck } from "lucide-react";
import { sampleCollectionService } from "../../services/sampleCollectionService";
import { useForm } from "react-hook-form";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { eventService, EVENTS } from "../../services/eventService";
import CenterSelect from '../common/CenterSelect';
import { Center } from '../../hooks/useCollectionCenters';
import { useAuth } from "../../hooks/useAuth";
import { fetchDrivers, Driver } from "../../services/driverService";

interface WalkInPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalkInFormData = {
  patientName: string;
  patientPhone: string;
  requestFormFile?: FileList;
};

export default function WalkInPatientModal({ isOpen, onClose }: WalkInPatientModalProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WalkInFormData>();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [requestFormUrl, setRequestFormUrl] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [centerPhone, setCenterPhone] = useState<string>("");
  
  // Driver assignment states
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driversLoading, setDriversLoading] = useState(false);

  // Load drivers when modal opens
  useEffect(() => {
    const loadDrivers = async () => {
      if (isOpen) {
        setDriversLoading(true);
        try {
          const driversData = await fetchDrivers();
          setDrivers(driversData);
        } catch (err) {
          console.error('Error loading drivers:', err);
          setError('Failed to load drivers. You can still register the patient without a driver assignment.');
        } finally {
          setDriversLoading(false);
        }
      }
    };

    loadDrivers();
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset();
      setError(null);
      setSuccess(false);
      setScannedBarcode(null);
      setSelectedCenter(null);
      setCenterPhone("");
      setSelectedDriverId("");
    }
  }, [isOpen, reset]);

  // Autofill phone when center changes
  useEffect(() => {
    if (selectedCenter) {
      setCenterPhone(selectedCenter.phone || "");
    } else {
      setCenterPhone("");
    }
  }, [selectedCenter]);

  // Handle barcode scanning
  useEffect(() => {
    if (showBarcodeScanner && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showBarcodeScanner]);

  const handleBarcodeScan = (code: string) => {
    setScannedBarcode(code);
    setShowBarcodeScanner(false);
  };

  const onSubmit = async (data: WalkInFormData) => {
    setLoading(true);
    setError(null);
    setFileUploadError(null);
    
    try {
      let uploadedUrl = null;
      if (data.requestFormFile && data.requestFormFile.length > 0) {
        setFileUploading(true);
        const file = data.requestFormFile[0];
        const storage = getStorage();
        const fileRef = storageRef(storage, `walkin-request-forms/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        uploadedUrl = await getDownloadURL(fileRef);
        setRequestFormUrl(uploadedUrl);
        setUploadedFileName(file.name);
        setFileUploading(false);
      }
      
      // Use selected center or fallback to SELF
      const centerToUse = selectedCenter ? selectedCenter.label : "SELF";
      let centerCoordinates: [number, number] = [-17.824858, 31.053028];
      if (selectedCenter && selectedCenter.coordinates && typeof selectedCenter.coordinates.lat === 'number' && typeof selectedCenter.coordinates.lng === 'number') {
        centerCoordinates = [selectedCenter.coordinates.lat, selectedCenter.coordinates.lng];
      }
      const centerAddress = selectedCenter ? selectedCenter.address : undefined;
      
      // Find the selected driver
      const selectedDriver = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
      
      // Create the request with status "collected" (default for walk-ins)
      const docId = await sampleCollectionService.createRequest({
        callerName: data.patientName,
        callerNumber: centerPhone || data.patientPhone,
        notes: scannedBarcode ? `Barcode: ${scannedBarcode}` : "",
        center: centerToUse,
        center_coordinates: centerCoordinates,
        center_address: centerAddress,
        priority: "routine",
        requestedAt: new Date().toISOString(),
        ...(uploadedUrl ? { request_form_url: uploadedUrl } : {}),
        ...(scannedBarcode ? { accession_number: scannedBarcode } : {}),
        // Add driver assignment for walk-in patients (for result delivery notification)
        ...(selectedDriver ? { 
          assignedDriver: {
            id: selectedDriver.id,
            name: selectedDriver.name,
            messageToken: selectedDriver.messageToken
          }
        } : {}),
      });
      
      // Update the status to "registered" immediately after creation
      const docRef = doc(db, "collectionRequests", docId);
      await updateDoc(docRef, {
        status: "registered",
        time_registered: serverTimestamp(),
        sampleID: scannedBarcode ? [scannedBarcode] : [],
        accession_number: scannedBarcode || "",
        updated_at: serverTimestamp(),
        registered_by: userData?.name || "Unknown User",
      });
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
      
      // Emit the WALK_IN_REGISTERED event
      eventService.emit(EVENTS.WALK_IN_REGISTERED);
      
    } catch (err) {
      console.error("Error registering walk-in patient:", err);
      setError("Failed to register walk-in patient. Please try again.");
      setFileUploading(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 relative shadow-lg">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center">
            <UserPlus className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold">Register Walk-in Patient</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {showBarcodeScanner ? (
          <div className="p-4 space-y-4">
            <h3 className="font-medium text-gray-700">Scan Barcode</h3>
            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={scannedBarcode || ""}
                onChange={(e) => setScannedBarcode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Barcode will appear here..."
                autoFocus
              />
            </div>
            <div className="text-sm text-gray-500">
              The barcode will be automatically processed when scanned
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  if (scannedBarcode) {
                    handleBarcodeScan(scannedBarcode);
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                disabled={!scannedBarcode}
              >
                Process Barcode
              </button>
              <button
                onClick={() => setShowBarcodeScanner(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-4">
            {error && (
              <div className="mb-4 bg-red-50 p-3 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 p-3 rounded-md text-green-600 text-sm">
                Patient registered successfully!
              </div>
            )}
            
            <div className="space-y-4">
              {/* Patient Name Field */}
              <div>
                <label className="block text-sm mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("patientName", { required: true })}
                  className={`w-full p-2 border rounded ${
                    errors.patientName ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={loading}
                />
                {errors.patientName && (
                  <p className="text-red-500 text-xs mt-1">Patient name is required</p>
                )}
              </div>

              {/* Center Dropdown */}
              <div>
                <label className="block text-sm mb-1">Collection Center <span className="text-red-500">*</span></label>
                <CenterSelect
                  selectedCenter={selectedCenter}
                  onSelect={setSelectedCenter}
                  placeholder="Search for a collection center..."
                />
              </div>

              {/* Patient Phone Field (autofilled if center selected) */}
              <div>
                <label className="block text-sm mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register("patientPhone", { required: true })}
                  value={centerPhone || undefined}
                  onChange={e => setCenterPhone(e.target.value)}
                  className={`w-full p-2 border rounded ${
                    errors.patientPhone ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={loading}
                />
                {errors.patientPhone && (
                  <p className="text-red-500 text-xs mt-1">Phone number is required</p>
                )}
              </div>

              {/* Driver Assignment */}
              <div>
                <label className="block text-sm mb-1">
                  <div className="flex items-center">
                    <Truck className="h-4 w-4 mr-1" />
                    Assign Driver for Result Delivery
                  </div>
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading || driversLoading}
                >
                  <option value="">No driver assignment (optional)</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.status})
                    </option>
                  ))}
                </select>
                {driversLoading && (
                  <p className="text-blue-500 text-xs mt-1">Loading drivers...</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Driver will be notified when results are ready for delivery (not for collection since this is walk-in)
                </p>
              </div>

              {/* Barcode Display */}
              {scannedBarcode && (
                <div>
                  <label className="block text-sm mb-1">Scanned Barcode</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={scannedBarcode}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setScannedBarcode(null)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Scan Barcode Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="w-full p-2 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  <Scan className="h-5 w-5 mr-2" />
                  {scannedBarcode ? "Scan Different Barcode" : "Scan Barcode"}
                </button>
              </div>

              {/* Optional File Upload */}
              <div>
                <label className="block text-sm mb-1">Request Form (PDF or Image, optional)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  {...register("requestFormFile")}
                  ref={fileInputRef}
                  className="w-full p-2 border border-gray-300 rounded"
                  disabled={loading || fileUploading}
                />
                {fileUploadError && (
                  <p className="text-red-500 text-xs mt-1">{fileUploadError}</p>
                )}
                {fileUploading && (
                  <p className="text-blue-500 text-xs mt-1">Uploading file...</p>
                )}
                {uploadedFileName && requestFormUrl && (
                  <p className="text-green-600 text-xs mt-1">Uploaded: <a href={requestFormUrl} target="_blank" rel="noopener noreferrer" className="underline">{uploadedFileName}</a></p>
                )}
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Register Patient"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 