import React, { useState, useEffect } from 'react';
import { Fuel, Car, Clock, Route } from 'lucide-react';
import { fuelService } from '../../services/fuelService';
import FuelStatsDetailsModal from './FuelStatsDetailsModal';

interface FuelStatsData {
  fuelDisbursed: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  totalVehicles: number;
  pendingRequests: number;
  distanceCovered: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
}

type StatType = 'fuel' | 'vehicles' | 'pending' | 'distance';

export default function FuelStats() {
  const [stats, setStats] = useState<FuelStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<StatType | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getFuelStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading fuel stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const handleStatClick = (type: StatType) => {
    setSelectedStatType(type);
    setShowDetailsModal(true);
  };

  const statCards = [
    {
      title: 'Fuel Disbursed',
      type: 'fuel' as StatType,
      value: stats.fuelDisbursed[selectedPeriod],
      unit: 'L',
      icon: Fuel,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Total Vehicles',
      type: 'vehicles' as StatType,
      value: stats.totalVehicles,
      unit: '',
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Pending Requests',
      type: 'pending' as StatType,
      value: stats.pendingRequests,
      unit: '',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Distance Covered',
      type: 'distance' as StatType,
      value: stats.distanceCovered[selectedPeriod],
      unit: 'km',
      icon: Route,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {(['today', 'week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 text-sm font-medium border ${
                selectedPeriod === period
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } ${
                period === 'today' ? 'rounded-l-lg' : ''
              } ${
                period === 'year' ? 'rounded-r-lg' : ''
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              onClick={() => handleStatClick(card.type)}
              className={`bg-white rounded-lg shadow-sm border ${card.borderColor} p-6 transition-all hover:scale-105 cursor-pointer hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">{card.title}</h3>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-gray-900">
                  {typeof card.value === 'number' 
                    ? card.value.toLocaleString(undefined, { 
                        minimumFractionDigits: card.unit === 'L' ? 2 : 0,
                        maximumFractionDigits: card.unit === 'L' ? 2 : 0 
                      })
                    : '0'}
                </p>
                {card.unit && (
                  <span className="ml-2 text-lg font-medium text-gray-500">{card.unit}</span>
                )}
              </div>
              {/* Show breakdown for time-based stats */}
              {(card.title === 'Fuel Disbursed' || card.title === 'Distance Covered') && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Today:</span>{' '}
                      {stats.fuelDisbursed.today.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {card.unit}
                    </div>
                    <div>
                      <span className="font-medium">Week:</span>{' '}
                      {(card.title === 'Fuel Disbursed' 
                        ? stats.fuelDisbursed.week 
                        : stats.distanceCovered.week
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {card.unit}
                    </div>
                    <div>
                      <span className="font-medium">Month:</span>{' '}
                      {(card.title === 'Fuel Disbursed' 
                        ? stats.fuelDisbursed.month 
                        : stats.distanceCovered.month
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {card.unit}
                    </div>
                    <div>
                      <span className="font-medium">Year:</span>{' '}
                      {(card.title === 'Fuel Disbursed' 
                        ? stats.fuelDisbursed.year 
                        : stats.distanceCovered.year
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {card.unit}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      <FuelStatsDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedStatType(null);
        }}
        statType={selectedStatType}
        period={selectedPeriod}
      />
    </div>
  );
}

