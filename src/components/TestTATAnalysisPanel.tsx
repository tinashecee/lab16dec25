import React, { useState, useEffect } from 'react';
import { SampleCollection } from '../services/sampleCollectionService';
import { calculateTAT, getTATStatus } from '../utils/tatCalculations';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface TestTATAnalysisPanelProps {
  sampleId: string;
}

export default function TestTATAnalysisPanel({ sampleId }: TestTATAnalysisPanelProps) {
  const [sample, setSample] = useState<SampleCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSample() {
      setLoading(true);
      try {
        const sampleDoc = await getDoc(doc(db, 'collectionRequests', sampleId));
        if (sampleDoc.exists()) {
          const sampleData = { id: sampleDoc.id, ...sampleDoc.data() } as SampleCollection;
          setSample(sampleData);
        } else {
          setError('Sample not found');
        }
      } catch (err) {
        console.error('Error fetching sample:', err);
        setError('Failed to load sample data');
      } finally {
        setLoading(false);
      }
    }

    if (sampleId) {
      fetchSample();
    }
  }, [sampleId]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading test TAT data...</div>;
  }

  if (error || !sample) {
    return <div className="p-4 text-red-500">{error || 'No data available'}</div>;
  }

  const tat = calculateTAT(sample);
  const tatMetrics = [
    { label: 'Dispatch Time', target: '20m', value: tat.dispatchTime, rawMinutes: tat.rawMinutes.dispatch },
    { label: 'Collection Time', target: '60m', value: tat.collectionTime, rawMinutes: tat.rawMinutes.collection },
    { label: 'Registration Time', target: '30m', value: tat.registrationTime, rawMinutes: tat.rawMinutes.registration },
    { label: 'Processing Time', target: '4h', value: tat.processingTime, rawMinutes: tat.rawMinutes.processing },
    { label: 'Delivery Time', target: '40m', value: tat.deliveryTime, rawMinutes: tat.rawMinutes.delivery }
  ];

  // Helper function to parse target time string to minutes
  const parseTargetTime = (target: string): number => {
    const hourMatch = target.match(/(\d+)h/);
    const minuteMatch = target.match(/(\d+)m/);
    let minutes = 0;
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) minutes += parseInt(minuteMatch[1]);
    return minutes;
  };

  return (
    <div className="space-y-4" key={`tat-panel-${Date.now()}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Test-specific Turnaround Times
      </h3>
      
      {/* Compact Row Layout - Force Update */}
      <div className="flex flex-wrap gap-2 md:gap-3" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {tatMetrics.map((metric, index) => {
          const targetMinutes = parseTargetTime(metric.target);
          const status = getTATStatus(metric.rawMinutes, targetMinutes);
          
          return (
            <div 
              key={`${metric.label}-${index}`} 
              className="bg-white rounded-lg shadow-sm border p-3"
              style={{ 
                flex: '1 1 120px', 
                minWidth: '120px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div className="text-center" style={{ textAlign: 'center' }}>
                <h4 className="text-xs font-medium text-gray-600 mb-1">
                  {metric.label}
                </h4>
                <p className="text-lg font-semibold text-gray-900">
                  {metric.value}
                </p>
                <div className="flex items-center justify-center mt-1 space-x-1">
                  <span className="text-xs text-gray-500">
                    Target: {metric.target}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    status === 'success' ? 'bg-green-100 text-green-700' : 
                    status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {status === 'success' ? 'On Time' : 'Delayed'}
                  </span>
                </div>
                
                {/* Compact Progress Bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      status === 'success' ? 'bg-green-500' : 
                      status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        metric.rawMinutes > 0 ? (metric.rawMinutes / targetMinutes) * 100 : 0,
                        100
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 