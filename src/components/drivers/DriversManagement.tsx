import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Users, RefreshCw, Activity, Clock3 } from "lucide-react";
import { attendanceService, AttendanceRecord } from "../../services/attendanceService";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";

type ViewMode = "attendance" | "location";

const TRACK_URL =
  "http://track.unitrack24.online/gps?username=NyashaChipato&password=Tadiwa2020@&auto_login=true";

export default function DriversManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("attendance");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceService.getAttendanceRecords();
      setRecords(data);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  // Sync view with URL query param ?view=attendance|location
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get("view");
    if (v === "location" || v === "attendance") {
      setView(v);
    } else {
      // default attendance in URL
      navigate(`${location.pathname}?view=attendance`, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    if (view === "attendance") {
      load();
    } else if (view === "location") {
      window.open(TRACK_URL, "_blank");
    }
  }, [view]);

  const activeRecords = useMemo(
    () => records.filter((r) => (r.status || "").toUpperCase() === "ACTIVE"),
    [records]
  );
  const completedRecords = useMemo(
    () => records.filter((r) => (r.status || "").toUpperCase() === "COMPLETED"),
    [records]
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-secondary-900">Driver Management</h1>
          <p className="text-secondary-600">
            Switch between location tracking and attendance overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="attendance">Attendance</option>
            <option value="location">Location</option>
          </select>
          {view === "attendance" && (
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {view === "location" ? (
        <div className="p-4 bg-white border rounded-xl">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary-600" />
            <div>
              <div className="font-semibold text-secondary-900">Location tracking</div>
              <div className="text-sm text-secondary-600">
                Opened the tracking dashboard in a new tab. If it did not open,{" "}
                <button
                  onClick={() => window.open(TRACK_URL, "_blank")}
                  className="text-primary-600 underline"
                >
                  click here
                </button>.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-secondary-600">Loading attendance...</div>
          ) : (
            <>
              <section className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-secondary-900">Active drivers</h2>
                  <span className="text-sm text-secondary-500">({activeRecords.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 text-sm font-medium text-secondary-900">
                            {r.user_name || "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-sm text-secondary-700">{r.user_email || "—"}</td>
                          <td className="px-3 py-2 text-sm text-secondary-700">
                            {r.clock_in_time?.toDate
                              ? format(r.clock_in_time.toDate(), "yyyy-MM-dd HH:mm")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-secondary-700">
                            {r.location?.lat && r.location?.lng
                              ? `${r.location.lat.toFixed(5)}, ${r.location.lng.toFixed(5)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-green-700 font-semibold">ACTIVE</td>
                        </tr>
                      ))}
                      {activeRecords.length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-sm text-gray-500" colSpan={5}>
                            No active drivers.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-secondary-900">Completed shifts</h2>
                  <span className="text-sm text-secondary-500">({completedRecords.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {completedRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 text-sm font-medium text-secondary-900">
                            {r.user_name || "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-sm text-secondary-700">{r.date || "—"}</td>
                          <td className="px-3 py-2 text-sm text-secondary-700">
                            {r.clock_in_time?.toDate
                              ? format(r.clock_in_time.toDate(), "yyyy-MM-dd HH:mm")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-secondary-700">
                            {r.clock_out_time?.toDate
                              ? format(r.clock_out_time.toDate(), "yyyy-MM-dd HH:mm")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-secondary-700">
                            {typeof r.total_hours === "number" ? r.total_hours.toFixed(2) : "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 font-semibold">COMPLETED</td>
                        </tr>
                      ))}
                      {completedRecords.length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-sm text-gray-500" colSpan={6}>
                            No completed shifts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
