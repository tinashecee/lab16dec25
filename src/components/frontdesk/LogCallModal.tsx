import { useState, useEffect } from "react";
import { X, Calendar, Clock } from "lucide-react";
import { callLogService } from "../../services/callLogService";
import { sampleCollectionService } from "../../services/sampleCollectionService";
import { fetchDrivers, Driver } from "../../services/driverService";
import CenterSelect from '../common/CenterSelect';
import { Center } from '../../hooks/useCollectionCenters';
import { eventService, EVENTS } from "../../services/eventService";

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  date: string;
  time: string;
  callPurpose: string;
  center: string;
  priority: "routine" | "urgent" | "emergency";
  callerName: string;
  callerNumber: string;
  callNotes: string;
  notifyDriver: string;
  center_coordinates: [number, number];
  center_address: string;
  center_contact: string;
  selectedCenter: Center | null;
}

interface FormErrors {
  date?: string;
  time?: string;
  callPurpose?: string;
  center?: string;
  priority?: string;
  callerName?: string;
  callerNumber?: string;
  callNotes?: string;
  notifyDriver?: string;
}

export default function LogCallModal({ isOpen, onClose }: LogCallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [formData, setFormData] = useState<FormData>({
    date: "",
    time: "",
    callPurpose: "",
    center: "",
    priority: "routine",
    callerName: "",
    callerNumber: "",
    callNotes: "",
    notifyDriver: "",
    center_coordinates: [0, 0],
    center_address: "",
    center_contact: "",
    selectedCenter: null,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const driversData = await fetchDrivers();
        setDrivers(driversData);
      } catch (err) {
        console.error("Error loading drivers:", err);
        setError("Failed to load drivers. Please try again.");
      }
    };

    if (isOpen) {
      loadDrivers();
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // Basic field validation - only validate required fields
    if (!formData.date) {
      errors.date = "Date is required";
      isValid = false;
    }
    if (!formData.time) {
      errors.time = "Time is required";
      isValid = false;
    }
    if (!formData.callPurpose) {
      errors.callPurpose = "Call purpose is required";
      isValid = false;
    }
    if (!formData.priority) {
      errors.priority = "Priority is required";
      isValid = false;
    }

    // Remove validation for caller name, number and notes since they're now optional
    // if (!formData.callerName) {
    //   errors.callerName = "Caller's name is required";
    //   isValid = false;
    // }
    // if (!formData.callerNumber) {
    //   errors.callerNumber = "Caller's number is required";
    //   isValid = false;
    // }
    // if (!formData.callNotes) {
    //   errors.callNotes = "Call notes are required";
    //   isValid = false;
    // }

    // Additional validation for sample collection
    if (formData.callPurpose === "sample_collection") {
      if (!formData.selectedCenter) {
        errors.center = "Collection center is required";
        isValid = false;
      }
      if (!formData.notifyDriver) {
        errors.notifyDriver = "Driver selection is required";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const resetForm = () => {
    setFormData({
      date: "",
      time: "",
      callPurpose: "",
      center: "",
      priority: "routine",
      callerName: "",
      callerNumber: "",
      callNotes: "",
      notifyDriver: "",
      center_coordinates: [0, 0],
      center_address: "",
      center_contact: "",
      selectedCenter: null,
    });
    setFormErrors({});
    setError(null);
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
  
    try {
      if (formData.callPurpose === "sample_collection") {
        if (!formData.selectedCenter) {
          throw new Error("Please select a center");
        }
         // Find the selected driver's details
         const selectedDriver = drivers.find(
          (d) => d.id === formData.notifyDriver
        );

  
        console.log("📍 Fetching coordinates using Geoapify...");
        const { lat, lng } = await getCoordinates(formData.selectedCenter.address);
           console.log(selectedDriver);
        await sampleCollectionService.createRequest({
          date: formData.date,
          time: formData.time,
          requestedAt: `${formData.date}T${formData.time}:00`,
          center: formData.selectedCenter.label,
          center_address: formData.selectedCenter.address,
          center_coordinates: [lat, lng],
          center_contact: formData.selectedCenter.contactPerson,
          status: "pending",
          priority: formData.priority,
          callerName: formData.callerName,
          callerNumber: formData.callerNumber,
          callPurpose: "sample_collection",
          notes: formData.callNotes,
          assignedDriver: selectedDriver
            ? {
                id: selectedDriver.id,
                name: selectedDriver.name,
                messageToken: selectedDriver.messageToken,
              }
            : undefined,
        });
  
        // Emit sample requested event to update table
        eventService.emit(EVENTS.SAMPLE_REQUESTED);
        onClose();
        resetForm();
      } else {
        await callLogService.logCall({
          date: formData.date,
          time: formData.time,
          callPurpose: formData.callPurpose as "inquiry" | "complaint" | "follow_up",
          center: formData.center,
          priority: formData.priority as "routine" | "urgent" | "emergency",
          callerName: formData.callerName,
          callerNumber: formData.callerNumber,
          callNotes: formData.callNotes,
        });
        
        // Emit call logged event to update table
        eventService.emit(EVENTS.CALL_LOGGED);
        onClose();
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save call log.");
    } finally {
      setLoading(false);
    }
  };
  
  
  const getCoordinates = async (address: string | number | boolean) => {
    const apiKey = "1796b7c0c7384fed9f9f0cf3ea518eae";
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      if (data.features.length === 0) {
        console.warn(`⚠️ No coordinates found for: ${address}`);
        return { lat: -17.8048449, lng: 31.093114};
      }
  
      const { lat, lon } = data.features[0].properties;
      console.log(`✅ Coordinates found: ${lat}, ${lon}`);
  
      return { lat, lng: lon };
    } catch (error) {
      console.error("❌ Error fetching coordinates:", error);
      return { lat: -17.8048449, lng: 31.093114};
    }
  };
  
  

  const handleCenterSelect = (center: Center) => {
    setFormData(prev => ({
      ...prev,
      selectedCenter: center,
      center: center.label,
      center_address: center.address,
      center_coordinates: [center.coordinates.lat, center.coordinates.lng],
      center_contact: center.contactPerson,
      callerName: center.contactPerson || prev.callerName,
      callerNumber: center.phone || prev.callerNumber
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-secondary-900">
                Log Call
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-secondary-400 hover:text-secondary-500 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      formErrors.date ? 'border-red-500' : 'border-gray-200'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {formErrors.date && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.date}</p>
                )}
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      formErrors.time ? 'border-red-500' : 'border-gray-200'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  <Clock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {formErrors.time && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.time}</p>
                )}
              </div>

              {/* Call Purpose */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Call Purpose <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.callPurpose}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      callPurpose: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select...</option>
                  <option value="sample_collection">Sample Collection</option>
                  <option value="inquiry">Inquiry</option>
                  <option value="complaint">Complaint</option>
                  <option value="follow_up">Follow Up</option>
                </select>
              </div>

              {/* Center */}
              {formData.callPurpose === 'sample_collection' && (
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collection Center
                    </label>
                    <CenterSelect
                      selectedCenter={formData.selectedCenter}
                      onSelect={handleCenterSelect}
                      placeholder="Search for a collection center..."
                    />
                    {formErrors.center && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.center}</p>
                    )}
                  </div>
                  {/* ... rest of your sample collection fields ... */}
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value as "routine" | "urgent" | "emergency",
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              {/* Caller's Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Caller Name
                </label>
                <input
                  type="text"
                  value={formData.callerName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      callerName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Caller's Number */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Caller Number
                </label>
                <input
                  type="tel"
                  value={formData.callerNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      callerNumber: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Call Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.callNotes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      callNotes: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Notify Driver Section */}
              {formData.callPurpose === "sample_collection" && (
                <div>
                  <p className="text-sm font-medium text-secondary-900 mb-2">
                    For sample collections, a driver needs to be notified.
                  </p>
                  <select
                    value={formData.notifyDriver}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notifyDriver: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select Driver...</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-secondary-600 hover:text-secondary-700">
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
