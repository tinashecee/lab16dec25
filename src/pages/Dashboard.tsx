import StatGroup from '../components/dashboard/stats/StatGroup';
import OverdueTestsBanner from '../components/common/OverdueTestsBanner';
import PendingApprovalsBanner from '../components/common/PendingApprovalsBanner';
import QueryBox from '../components/dashboard/QueryBox';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-600">Laboratory overview and key metrics</p>
      </div>

      {/* Pending Approvals Banner */}
      <PendingApprovalsBanner />

      {/* Overdue Tests Banner */}
      <OverdueTestsBanner />

      {/* Stats Overview */}
      <StatGroup />

      {/* Query Box */}
      <QueryBox />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add your main dashboard components here */}
        </div>

      
      </div>
    </div>
  );
} 