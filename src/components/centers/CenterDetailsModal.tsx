import React, { useState, useEffect } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { updateCenterCoordinates, getCenter } from '../../services/crelioApi';
import GoogleMapsWrapper from '../maps/GoogleMapsWrapper';

interface CenterDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  center: {
    id: string;
    name: string;
    speciality: string;
    contact: string;
    docAddress: string;
    email: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    lastSynced?: string;
    source: 'crelio' | 'local';
  };
}

const DEFAULT_ADDRESS = "18 East Road, Harare, Zimbabwe";
const DEFAULT_COORDINATES = { lat: -17.804706973619854, lng: 31.041854110573905 }; // Coordinates for the default address

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const mapOptions = {
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    }
  ],
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoom: 17,
};

export function CenterDetailsModal({ isOpen, onClose, center: initialCenter }: CenterDetailsModalProps) {
  const [center, setCenter] = useState(initialCenter);
  const [coordinates, setCoordinates] = useState(initialCenter.coordinates || DEFAULT_COORDINATES);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch latest center data when modal opens
  useEffect(() => {
    const fetchCenterData = async () => {
      if (!isOpen) return;
      
      setIsFetching(true);
      try {
        const updatedCenter = await getCenter(initialCenter.id);
        if (updatedCenter) {
          setCenter(updatedCenter);
          if (updatedCenter.coordinates) {
            setCoordinates(updatedCenter.coordinates);
          }
        }
      } catch (error) {
        console.error('Error fetching center data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchCenterData();
  }, [isOpen, initialCenter.id]);

  useEffect(() => {
    const geocodeAddress = async () => {
      // Only geocode if we don't have coordinates and have a valid address
      if (!center.coordinates && center.docAddress && center.docAddress !== DEFAULT_ADDRESS) {
        setIsLoading(true);
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ address: center.docAddress });
          
          if (result.results[0]?.geometry?.location) {
            const newCoords = {
              lat: result.results[0].geometry.location.lat(),
              lng: result.results[0].geometry.location.lng()
            };
            setCoordinates(newCoords);
            
            // Update coordinates in Firebase
            if (center.source === 'crelio') {
              await updateCenterCoordinates(center.id, newCoords);
              // Refresh center data after updating coordinates
              const updatedCenter = await getCenter(center.id);
              if (updatedCenter) {
                setCenter(updatedCenter);
              }
            }
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isOpen && typeof google !== 'undefined' && !isFetching) {
      geocodeAddress();
    }
  }, [isOpen, center.docAddress, center.coordinates, center.id, center.source, isFetching]);

  const renderMap = () => {
    if (isFetching) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading center data...</p>
          </div>
        </div>
      );
    }

    if (typeof google === 'undefined') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center p-4">
            <p className="text-gray-500">Map loading...</p>
          </div>
        </div>
      );
    }

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center p-4">
            <p className="text-red-500">Google Maps API key is not configured</p>
            <p className="text-sm text-gray-500 mt-2">Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Locating address...</p>
          </div>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={coordinates}
        options={{
          ...mapOptions,
          mapId: "center-details-map", // Required for advanced markers
        }}
      >
        <MarkerF
          position={coordinates}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#1E40AF',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }}
          animation={google.maps.Animation.DROP}
          title={center.name}
        />
      </GoogleMap>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">{center.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Speciality</h3>
              <p className="mt-1 text-sm text-gray-900">{center.speciality || '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Contact</h3>
              <p className="mt-1 text-sm text-gray-900">{center.contact || '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p className="mt-1 text-sm text-gray-900">{center.email || '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Address</h3>
              <p className="mt-1 text-sm text-gray-900">
                {center.docAddress || DEFAULT_ADDRESS}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
              <p className="mt-1 text-sm text-gray-900">
                {center.lastSynced ? new Date(center.lastSynced).toLocaleString() : 'Never'}
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {center.source}
                </span>
              </p>
            </div>
          </div>

          <div className="h-[400px] relative rounded-lg overflow-hidden shadow-lg">
            <GoogleMapsWrapper>
              {renderMap()}
            </GoogleMapsWrapper>
          </div>
        </div>
      </div>
    </div>
  );
} 