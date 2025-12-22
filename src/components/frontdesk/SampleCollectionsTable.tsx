import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "../../config/firebase";
import { DocumentSnapshot } from "firebase/firestore";
import { Phone, MapPin, Clock, User, FileText, MoreHorizontal } from "lucide-react";
import { eventService, EVENTS } from "../../services/eventService";
import { useGeneralCalls } from "../../hooks/queries/frontdesk/useGeneralCalls";
import { useQueryClient } from "@tanstack/react-query";

// Define the types for general call data
interface GeneralCall {
  id: string;
  callerId?: string;
  callerName?: string;
  callerNumber?: string;
  callPurpose?: string;
  callNotes?: string;
  date?: string;
  time?: string;
  status?: string;
  selectedCenter?: {
    name?: string;
    address?: string;
    contactPerson?: string;
  };
  created_at?: any;
}

export default function SampleCollectionsTable() {
  const { data: calls = [], isLoading, isError } = useGeneralCalls();
  const error = isError ? "Failed to load general calls" : null;
  const [selectedCall, setSelectedCall] = useState<GeneralCall | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const queryClient = useQueryClient();

  useEffect(() => {
    const callLoggedUnsubscribe = eventService.subscribe(EVENTS.CALL_LOGGED, () => {
      queryClient.invalidateQueries({ queryKey: ['frontdesk', 'generalCalls'] });
    });
    const walkInUnsubscribe = eventService.subscribe(EVENTS.WALK_IN_REGISTERED, () => {
      queryClient.invalidateQueries({ queryKey: ['frontdesk', 'generalCalls'] });
    });
    return () => {
      callLoggedUnsubscribe();
      walkInUnsubscribe();
    };
  }, []);

  const loadMoreCalls = async () => {
    // For simplicity, trigger refetch; pagination can be added to the hook later if needed
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'generalCalls'] });
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(calls.length / itemsPerPage);
  const paginatedCalls = itemsPerPage === -1
    ? calls
    : calls.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  if (isLoading && calls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-red-500 p-4 text-center">
          <p>{error}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['frontdesk', 'generalCalls'] })}
            className="mt-2 text-primary-600 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 p-8 text-center">
          <p>No general calls found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <div className="flex gap-4 mb-4 items-center">
          <label className="text-sm text-gray-700">View: </label>
          <select
            value={itemsPerPage}
            onChange={e => {
              const val = e.target.value;
              setCurrentPage(1);
              if (val === 'all') {
                setItemsPerPage(-1);
              } else {
                setItemsPerPage(Number(val));
              }
            }}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            {[30, 60, 90, 100].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
            <option value="all">All</option>
          </select>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Caller Details
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purpose
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCalls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{call.callerName || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {call.callerNumber || 'N/A'}
                      </p>
                      {call.selectedCenter && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {call.selectedCenter.name || 'Unknown Center'}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">
                    {call.callPurpose || 'General Inquiry'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    <span>
                      {call.date ? call.date : 'Unknown date'}
                      {call.time ? `, ${call.time}` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 flex items-start">
                    <FileText className="h-4 w-4 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                    <p className="truncate max-w-xs">
                      {call.callNotes || 'No notes provided'}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedCall(call)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {isLoading && calls.length > 0 && (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary-600 border-r-transparent"></div>
          <span className="ml-2">Loading more...</span>
        </div>
      )}
      
      {lastDoc && !isLoading && (
        <div className="p-4 text-center">
          <button
            onClick={loadMoreCalls}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Load More
          </button>
        </div>
      )}
      
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
      
      {/* Call Details Modal - Add a simple modal to show call details */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">Call Details</h3>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Caller Information</h4>
                <p className="mt-1">{selectedCall.callerName || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{selectedCall.callerNumber || 'N/A'}</p>
              </div>
              
              {selectedCall.selectedCenter && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Center</h4>
                  <p className="mt-1">{selectedCall.selectedCenter.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">
                    {selectedCall.selectedCenter.address || 'No address provided'}
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Call Purpose</h4>
                <p className="mt-1">{selectedCall.callPurpose || 'General Inquiry'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date & Time</h4>
                <p className="mt-1">
                  {selectedCall.date ? selectedCall.date : 'Unknown date'}
                  {selectedCall.time ? `, ${selectedCall.time}` : ''}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p className="mt-1">{selectedCall.callNotes || 'No notes provided'}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
