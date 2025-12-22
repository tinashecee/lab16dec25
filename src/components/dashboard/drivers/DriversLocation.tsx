import { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Navigation, List, Activity, Expand, X, Package, CheckCircle } from 'lucide-react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Driver, subscribeToDrivers, getDriverStats, DriverStats } from '../../../services/driverService';
import { useAuth } from '../../../hooks/useAuth';

type ViewMode = 'drivers' | 'activities';

const mapContainerStyle = {
  width: '100%',
  height: '700px'
};

const center = {
  lat: -17.8292,
  lng: 31.0522
};

// Define libraries array outside component to prevent recreating on each render
const libraries: ('places' | 'geometry' | 'marker')[] = ['places', 'geometry', 'marker'];

export default function DriversLocation() {
  const { userData } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('drivers');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Define roles that can view driver statistics
  const authorizedRoles = [
    'Finance Manager',
    'Admin Manager', 
    'IT Specialist',
    'Lab Manager',
    'Lab Supervisor',
    'Admin Supervisor'
  ];

  // Check if current user has permission to view driver stats
  const canViewDriverStats = userData?.role && authorizedRoles.includes(userData.role);

  useEffect(() => {
    const unsubscribe = subscribeToDrivers(
      (driversData) => {
        setDrivers(driversData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching drivers:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onMapClick = useCallback(() => {
    setSelectedDriver(null);
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleDriverSelect = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
    
    // Zoom to the driver's location if map is loaded
    if (mapRef.current && driver.coordinates) {
      mapRef.current.panTo(driver.coordinates);
      mapRef.current.setZoom(16); // Zoom in closer
    }

    // Fetch driver statistics only if user has permission
    if (canViewDriverStats) {
      setStatsLoading(true);
      setDriverStats(null);
      getDriverStats(driver.id)
        .then(stats => {
          setDriverStats(stats);
        })
        .catch(error => {
          console.error('Error fetching driver stats:', error);
        })
        .finally(() => {
          setStatsLoading(false);
        });
    } else {
      // Clear stats if user doesn't have permission
      setDriverStats(null);
      setStatsLoading(false);
    }
  }, [canViewDriverStats]);

  const renderDriversListView = () => {
    if (loading) {
      return <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>
        ))}
      </div>;
    }

    if (drivers.length === 0) {
      return <div className="text-center text-gray-500 py-8">
        No drivers available
      </div>;
    }

    return (
      <div className="space-y-2 h-[700px] overflow-auto pr-2">
        {drivers.map((driver) => (
          <div 
            key={driver.id}
            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${
              selectedDriver?.id === driver.id
                ? 'bg-primary-50 border-primary-200'
                : 'border-gray-100 hover:bg-gray-50'
            }`}
            onClick={() => handleDriverSelect(driver)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${
                  driver.status === 'Active' 
                    ? 'bg-green-500' 
                    : driver.status === 'Idle'
                    ? 'bg-amber-500'
                    : 'bg-gray-500'
                }`} />
              </div>
              <div className="truncate">
                <p className="font-medium text-sm text-secondary-900 truncate">{driver.name}</p>
                <div className="flex items-center gap-1 text-xs text-secondary-500">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{driver.location}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Last updated: {driver.lastUpdate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderActivitiesView = () => {
    return (
      <div className="text-center text-gray-500 py-8">
        Recent driver activities will appear here
      </div>
    );
  };

  // Helper function to render info window content
  const renderInfoWindowContent = () => {
    if (!selectedDriver) return null;
    
    return (
      <div className="p-2">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={`https://ui-avatars.com/api/?name=${selectedDriver.name}&background=random&size=32`}
            alt={selectedDriver.name}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="font-medium text-secondary-900">{selectedDriver.name}</p>
            <p className="text-xs text-secondary-500">{selectedDriver.location}</p>
          </div>
        </div>
        
        <div className="text-xs text-secondary-600 mb-3">
          <p>Status: <span className={`font-medium ${
            selectedDriver.status === 'Active' ? 'text-green-600' : 
            selectedDriver.status === 'Idle' ? 'text-amber-600' : 'text-gray-600'
          }`}>{selectedDriver.status}</span></p>
          <p>Last Update: {selectedDriver.lastUpdate}</p>
        </div>

        {statsLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-100 rounded"></div>
            <div className="h-4 bg-gray-100 rounded"></div>
            <div className="h-4 bg-gray-100 rounded"></div>
          </div>
        ) : driverStats && canViewDriverStats ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Package className="w-3 h-3 text-primary-500" />
                <span className="text-xs font-semibold text-secondary-700">Samples Collected</span>
              </div>
              <div className="grid grid-cols-3 gap-1 px-1">
                <div>
                  <p className="text-xs text-secondary-500">Today</p>
                  <p className="text-sm font-semibold">{driverStats.samplesCollected.today}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Week</p>
                  <p className="text-sm font-semibold">{driverStats.samplesCollected.thisWeek}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Month</p>
                  <p className="text-sm font-semibold">{driverStats.samplesCollected.thisMonth}</p>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs font-semibold text-secondary-700">Results Delivered</span>
              </div>
              <div className="grid grid-cols-3 gap-1 px-1">
                <div>
                  <p className="text-xs text-secondary-500">Today</p>
                  <p className="text-sm font-semibold">{driverStats.resultsDelivered.today}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Week</p>
                  <p className="text-sm font-semibold">{driverStats.resultsDelivered.thisWeek}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Month</p>
                  <p className="text-sm font-semibold">{driverStats.resultsDelivered.thisMonth}</p>
                </div>
              </div>
            </div>
          </div>
        ) : !canViewDriverStats ? (
          <div className="text-xs text-gray-500 italic">
            Performance statistics are restricted to authorized roles only
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">
            Statistics not available
          </div>
        )}
      </div>
    );
  };

  const renderMapView = () => {
    if (loadError) {
      return <div className="text-red-500">
        Error loading maps: Please check your API key
      </div>;
    }
    
    if (!isLoaded) {
      return <div className="animate-pulse">Loading maps...</div>;
    }

    return (
      <div className="relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={center}
          onClick={onMapClick}
          onLoad={onMapLoad}
          options={{
            mapId: "drivers-location-map", // Required for advanced markers
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ],
            disableDefaultUI: true,
            zoomControl: true,
          }}
        >
          {drivers.map((driver) => (
            <MarkerF
              key={driver.id}
              position={driver.coordinates}
              onClick={() => handleDriverSelect(driver)}
              icon={{
                url: `https://ui-avatars.com/api/?name=${driver.name}&background=random&size=32`,
                scaledSize: new window.google.maps.Size(32, 32),
                origin: new window.google.maps.Point(0, 0),
                anchor: new window.google.maps.Point(16, 16),
              }}
            />
          ))}

          {selectedDriver && (
            <InfoWindowF
              position={selectedDriver.coordinates}
              onCloseClick={() => setSelectedDriver(null)}
            >
              {renderInfoWindowContent()}
            </InfoWindowF>
          )}
        </GoogleMap>
        <button 
          onClick={() => setIsMapExpanded(true)}
          className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 z-10"
          title="Expand map"
        >
          <Expand className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // Modal for expanded map
  const renderExpandedMapModal = () => {
    if (!isMapExpanded) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-6xl h-5/6 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-bold text-lg">Drivers Map</h3>
            <button 
              onClick={() => setIsMapExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 p-4">
            <div className="relative h-full">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                zoom={selectedDriver ? 16 : 13}
                center={selectedDriver ? selectedDriver.coordinates : center}
                onClick={onMapClick}
                onLoad={onMapLoad}
                options={{
                  mapId: "drivers-location-map-expanded", // Required for advanced markers
                  styles: [
                    {
                      featureType: "poi",
                      elementType: "labels",
                      stylers: [{ visibility: "off" }]
                    }
                  ],
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
              >
                {drivers.map((driver) => (
                  <MarkerF
                    key={driver.id}
                    position={driver.coordinates}
                    onClick={() => handleDriverSelect(driver)}
                    icon={{
                      url: `https://ui-avatars.com/api/?name=${driver.name}&background=random&size=32`,
                      scaledSize: new window.google.maps.Size(32, 32),
                      origin: new window.google.maps.Point(0, 0),
                      anchor: new window.google.maps.Point(16, 16),
                    }}
                  />
                ))}

                {selectedDriver && (
                  <InfoWindowF
                    position={selectedDriver.coordinates}
                    onCloseClick={() => setSelectedDriver(null)}
                  >
                    {renderInfoWindowContent()}
                  </InfoWindowF>
                )}
              </GoogleMap>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Navigation className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-secondary-900">Drivers Location</h3>
            <p className="text-sm text-secondary-500">Real-time tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full mr-2">
            {drivers.filter(d => d.status === 'Active').length} Active
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left sidebar - 20% width */}
        <div className="w-1/5">
          <div className="flex rounded-lg border border-gray-200 p-1 mb-4">
            <button
              onClick={() => setViewMode('drivers')}
              className={`p-2 rounded flex-1 flex justify-center items-center gap-1 ${
                viewMode === 'drivers'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-secondary-400 hover:text-secondary-600'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-xs">Drivers List</span>
            </button>
            <button
              onClick={() => setViewMode('activities')}
              className={`p-2 rounded flex-1 flex justify-center items-center gap-1 ${
                viewMode === 'activities'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-secondary-400 hover:text-secondary-600'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-xs">Recent Activities</span>
            </button>
          </div>
          {viewMode === 'drivers' ? renderDriversListView() : renderActivitiesView()}
        </div>
        
        {/* Map view - 80% width */}
        <div className="w-4/5">
          {renderMapView()}
        </div>
      </div>
      
      {/* Expanded map modal */}
      {renderExpandedMapModal()}
    </div>
  );
} 