import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { ActivityLog, activityLogService, ActivityType } from '../../../services/activityLogService';

export default function DriversActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Define activity types for key driver and sample activities
        const activityTypes: ActivityType[] = [
          'SAMPLE_ACCEPTED',
          'SAMPLE_COLLECTED',
          'SAMPLE_DELIVERED',
          'SAMPLE_HANDOVER',
          // Add more if needed, e.g. 'SAMPLE_COMPLETED', 'RESULT_DELIVERED' if they exist
        ];

        // Calculate 24 hours ago
        const now = new Date();
        const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch recent activities for the last 24 hours, limit to 15
        const recentActivities = await activityLogService.getRecentActivities({
          limit: 15,
          activityTypes,
          startDate,
        });

        setActivities(recentActivities);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Clock className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="font-medium text-secondary-900">Recent Activities</h3>
          <p className="text-sm text-secondary-500">Driver updates</p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="relative">
              <img
                src={`https://ui-avatars.com/api/?name=${activity.userName}&background=random`}
                alt={activity.userName}
                className="w-8 h-8 rounded-full"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-secondary-900">
                <span className="font-medium">{activity.userName}</span>
                {' '}{activity.details}
              </p>
              <span className="text-xs text-secondary-500">
                {activity.timestamp && new Date(activity.timestamp.toDate()).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
        View All Activities
      </button>
    </div>
  );
} 