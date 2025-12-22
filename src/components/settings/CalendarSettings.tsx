import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { Plus, X, Trash2 } from "lucide-react";

interface Holiday {
  id: string;
  name: string;
  date: string;
  createdAt: Timestamp;
}

interface WorkingHours {
  startTime: string;
  endTime: string;
  days: string[];
}

export default function CalendarSettings() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    startTime: "08:00",
    endTime: "17:00",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });
  const [loading, setLoading] = useState(false);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const holidaysRef = collection(db, "holidays");
      const snapshot = await getDocs(holidaysRef);
      const fetchedHolidays = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Holiday[];
      setHolidays(fetchedHolidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const holidaysRef = collection(db, "holidays");
      await addDoc(holidaysRef, {
        ...newHoliday,
        createdAt: Timestamp.now(),
      });

      await fetchHolidays();
      setNewHoliday({ name: "", date: "" });
      setShowHolidayModal(false);
    } catch (error) {
      console.error("Error adding holiday:", error);
      alert("Failed to add holiday");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    try {
      setLoading(true);
      const workingHoursRef = collection(db, "settings");
      await addDoc(workingHoursRef, {
        type: "workingHours",
        ...workingHours,
        updatedAt: Timestamp.now(),
      });
      alert("Working hours saved successfully");
    } catch (error) {
      console.error("Error saving working hours:", error);
      alert("Failed to save working hours");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) {
      return;
    }

    try {
      setLoading(true);
      const holidayRef = doc(db, "holidays", holidayId);
      await deleteDoc(holidayRef);
      await fetchHolidays(); // Refresh the list
    } catch (error) {
      console.error("Error deleting holiday:", error);
      alert("Failed to delete holiday");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Holidays Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Holidays</h2>
          <button
            onClick={() => setShowHolidayModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {holiday.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {holiday.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Working Hours Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Working Hours
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={workingHours.startTime}
                onChange={(e) =>
                  setWorkingHours({
                    ...workingHours,
                    startTime: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={workingHours.endTime}
                onChange={(e) =>
                  setWorkingHours({ ...workingHours, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Working Days
            </label>
            <div className="space-y-2">
              {daysOfWeek.map((day) => (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={workingHours.days.includes(day)}
                    onChange={(e) => {
                      const newDays = e.target.checked
                        ? [...workingHours.days, day]
                        : workingHours.days.filter((d) => d !== day);
                      setWorkingHours({ ...workingHours, days: newDays });
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{day}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveWorkingHours}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Add Holiday
              </h2>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) =>
                    setNewHoliday({ ...newHoliday, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter holiday name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) =>
                    setNewHoliday({ ...newHoliday, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {loading ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
