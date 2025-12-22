import { SampleCollection } from '@/services/sampleCollectionService';
import { calculateTAT, getTATStatus } from '@/utils/tatCalculations';

interface TATAnalysisProps {
  sample: SampleCollection;
}

export function TATAnalysis({ sample }: TATAnalysisProps) {
  const tat = calculateTAT(sample);
  const tatMetrics = [
    { label: 'Dispatch Time', target: '20m', value: tat.dispatchTime },
    { label: 'Collection Time', target: '60m', value: tat.collectionTime },
    { label: 'Registration Time', target: '30m', value: tat.registrationTime },
    { label: 'Processing Time', target: '4h', value: tat.processingTime },
    { label: 'Delivery Time', target: '40m', value: tat.deliveryTime }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Overall Turnaround Time
        </h3>
        <div className="text-3xl font-bold text-primary-600">
          {tat.totalTAT}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Total time from request to delivery
        </p>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tatMetrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  {metric.label}
                </h4>
                <p className="text-2xl font-semibold mt-1">
                  {metric.value}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-500">
                  Target: {metric.target}
                </span>
                <span className={`text-sm mt-1 ${
                  getTATStatus(metric.value, parseInt(metric.target)) === 'On Time'
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}>
                  {getTATStatus(metric.value, parseInt(metric.target))}
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  getTATStatus(metric.value, parseInt(metric.target)) === 'On Time'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(
                    (parseInt(metric.value) / parseInt(metric.target)) * 100,
                    100
                  )}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 