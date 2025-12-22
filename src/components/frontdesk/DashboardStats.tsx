import { ClipboardList, CheckCircle, Building2, Clock } from 'lucide-react';
import { useFilteredCollectionStats, TimeFilter } from '@/hooks/useFilteredCollectionStats';

export default function DashboardStats() {
  const { stats, loading, error, timeFilter, setTimeFilter } = useFilteredCollectionStats();
  
  // Format the filter label for display
  const getFilterLabel = () => {
    switch(timeFilter) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
    }
  };
  
  const statCards = [
    { 
      title: 'Pending Requests', 
      value: stats.pendingRequests, 
      icon: <ClipboardList className="w-5 h-5" />, 
      color: 'bg-yellow-100 text-yellow-600' 
    },
    { 
      title: 'Completed Requests', 
      value: stats.completedRequests, 
      icon: <CheckCircle className="w-5 h-5" />, 
      color: 'bg-green-100 text-green-600' 
    },
    { 
      title: 'Unique Centers', 
      value: stats.uniqueCenters, 
      icon: <Building2 className="w-5 h-5" />, 
      color: 'bg-blue-100 text-blue-600' 
    },
    { 
      title: 'Total Requests', 
      value: stats.totalRequests, 
      icon: <Clock className="w-5 h-5" />, 
      color: 'bg-purple-100 text-purple-600' 
    },
  ];
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-700">Dashboard Statistics</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
          <button
            onClick={() => setTimeFilter(timeFilter)} // Retry by triggering the effect again
            className="ml-2 underline text-red-700 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.title}</p>
                {loading ? (
                  <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                ) : (
                  <div>
                    <p className="text-xl font-semibold">{stat.value}</p>
                    <p className="text-xs text-gray-400">{getFilterLabel()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 