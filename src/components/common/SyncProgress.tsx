import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncProgressProps {
  progress: number;
  isSyncing: boolean;
  results?: {
    total: number;
    updated: number;
    new: number;
  };
}

export function SyncProgress({ progress, isSyncing, results }: SyncProgressProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className={`w-5 h-5 text-primary-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <h3 className="text-lg font-semibold text-gray-900">
            {isSyncing ? 'Syncing with Crelio...' : 'Sync Complete'}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {!isSyncing && results && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Sync Results</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">{results.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-green-600">{results.new}</p>
                  <p className="text-sm text-gray-500">New</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-blue-600">{results.updated}</p>
                  <p className="text-sm text-gray-500">Updated</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 