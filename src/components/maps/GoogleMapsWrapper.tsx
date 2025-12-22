import React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { useGoogleMaps, GoogleMapsProvider } from '../../contexts/GoogleMapsContext';

interface GoogleMapsWrapperProps {
  children: React.ReactNode;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization" | "geocoding")[] = [
  "places", 
  "geometry",
  "geocoding"
];

function GoogleMapsInnerWrapper({ children }: GoogleMapsWrapperProps) {
  const { apiKey } = useGoogleMaps();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries
  });

  if (loadError) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading maps
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading maps...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function GoogleMapsWrapper({ children }: GoogleMapsWrapperProps) {
  return (
    <GoogleMapsProvider>
      <GoogleMapsInnerWrapper>{children}</GoogleMapsInnerWrapper>
    </GoogleMapsProvider>
  );
} 