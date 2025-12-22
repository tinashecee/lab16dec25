import { useEffect, useState } from 'react';
import { collectionRequestService, type CollectionRequest } from '@/services/collectionRequestService';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export default function PendingRequestsTable() {
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData>>();
  const [hasMore, setHasMore] = useState(true);

  const fetchRequests = async (isLoadingMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await collectionRequestService.getPendingRequests(
        isLoadingMore ? lastDoc : undefined
      );

      setRequests(prev => 
        isLoadingMore ? [...prev, ...result.requests] : result.requests
      );
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error fetching collection requests:', err);
      setError('Failed to fetch collection requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Pending Sample Collections</h3>
        
        {loading && <div className="text-center py-4">Loading...</div>}
        
        {error && (
          <div className="text-red-600 text-center py-4">
            {error}
            <button 
              onClick={() => fetchRequests()}
              className="ml-2 text-primary-600 hover:text-primary-500"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No pending sample collections found
          </div>
        )}

        {requests.length > 0 && (
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sample ID
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Center
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caller
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.sample_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.center_name}</div>
                        <div className="text-xs text-gray-500">{request.center_address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${request.priority === 'urgent' ? 'bg-yellow-100 text-yellow-800' : 
                            request.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.caller_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.caller_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.requested_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => fetchRequests(true)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 