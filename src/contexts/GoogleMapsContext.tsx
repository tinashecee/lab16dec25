import React, { createContext, useContext, useState, useEffect, lazy, Suspense } from 'react';
import { getGoogleMapsApiKey } from '../services/settingsService';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const GoogleMapsContext = createContext<{ 
  isLoaded: boolean;
  loadMaps: () => Promise<void>;
  apiKey: string | null;
}>({ 
  isLoaded: false,
  loadMaps: async () => {},
  apiKey: null,
});

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    getGoogleMapsApiKey()
      .then(setApiKey)
      .catch((error: Error) => console.error('Failed to load Google Maps API key:', error));
  }, []);

  const loadMaps = async () => {
    if (isLoaded || !apiKey) return;
    
    await import('@react-google-maps/api');
    
    return new Promise<void>((resolve) => {
      setMapsLoaded(true);
      setIsLoaded(true);
      resolve();
    });
  };

  if (!apiKey) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadMaps, apiKey }}>
      {mapsLoaded ? (
        <Suspense fallback={<LoadingSpinner />}>
          {React.createElement(
            lazy(() => import('@react-google-maps/api').then(module => ({
              default: ({ children }: { children: React.ReactNode }) => (
                <module.LoadScript
                  googleMapsApiKey={apiKey}
                  libraries={['places', 'geometry']}
                  onLoad={() => setIsLoaded(true)}
                >
                  {children}
                </module.LoadScript>
              )
            }))),
            { children }
          )}
        </Suspense>
      ) : (
        children
      )}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);
