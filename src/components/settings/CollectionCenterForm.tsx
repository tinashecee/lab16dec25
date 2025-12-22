import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

interface CollectionCenterFormData {
  centerName: string;
  address: string;
  email: string;
  phone: string;
  route: string;
  contactPerson: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CollectionCenterFormData) => Promise<void>;
}

const routes = ['Route A', 'Route B', 'Route C', 'Route D', 'Route E'];

const mapContainerStyle = {
  width: '100%',
  height: '300px'
};

const defaultCenter = {
  lat: -17.824858,
  lng: 31.053028
};

const libraries = ['places', 'geometry'] as const;

export const CollectionCenterForm: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors }, setError } = useForm<CollectionCenterFormData>();
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [coordinates, setCoordinates] = useState(defaultCenter);
  const [addressVerified, setAddressVerified] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState('');
  const address = watch('address');
  const centerName = watch('centerName');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(true);
  const { isLoaded } = useGoogleMaps();

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!isOpen) {
      reset();
      setShowMapPreview(false);
      setAddressVerified(false);
      setFormattedAddress('');
    }
  }, [isOpen, reset]);

  const handleAddressPreview = async () => {
    if (!address) {
      setError('address', {
        type: 'manual',
        message: 'Please enter an address to verify'
      });
      return;
    }

    try {
      setIsGeocoding(true);
      setAddressVerified(false);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        const newCoordinates = { lat, lng };
        const formattedAddr = data.results[0].formatted_address;
        
        setCoordinates(newCoordinates);
        setValue('coordinates', newCoordinates);
        setFormattedAddress(formattedAddr);
        setValue('address', formattedAddr);
        setShowMapPreview(true);
        setAddressVerified(true);
        setShowInfoWindow(true);
      } else {
        console.error('Geocoding failed:', data.status);
        setError('address', {
          type: 'manual',
          message: 'Failed to verify address. Please check and try again.'
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setError('address', {
        type: 'manual',
        message: 'Error verifying address. Please try again.'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMarkerDragEnd = async (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newCoordinates = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newCoordinates.lat},${newCoordinates.lng}&key=${GOOGLE_MAPS_API_KEY}`
        );

        const data = await response.json();

        if (data.status === 'OK' && data.results[0]) {
          const formattedAddr = data.results[0].formatted_address;
          setFormattedAddress(formattedAddr);
          setValue('address', formattedAddr);
          setCoordinates(newCoordinates);
          setValue('coordinates', newCoordinates);
          setAddressVerified(true);
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
      }
    }
  };

  const onFormSubmit = async (data: CollectionCenterFormData) => {
    if (!addressVerified) {
      setError('address', {
        type: 'manual',
        message: 'Please verify the address first'
      });
      return;
    }

    try {
      await onSubmit({
        ...data,
        coordinates: coordinates
      });
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } z-50`}
    >
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Collection Center</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Center Name</label>
              <input
                type="text"
                placeholder="Enter center name"
                {...register('centerName', { required: 'Center name is required' })}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.centerName && (
                <p className="mt-1 text-sm text-red-600">{errors.centerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  placeholder="Enter physical address"
                  {...register('address', { required: 'Address is required' })}
                  className={`block w-full px-3 py-2 rounded-md border ${
                    addressVerified ? 'border-green-500' : 'border-gray-300'
                  } shadow-sm focus:border-primary-500 focus:ring-primary-500 pr-20`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  {addressVerified && (
                    <span className="mr-2 text-xs text-green-600">Verified</span>
                  )}
                  <button
                    type="button"
                    onClick={handleAddressPreview}
                    disabled={isGeocoding}
                    className="px-3 py-1 h-full flex items-center"
                  >
                    {isGeocoding ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
                    ) : (
                      <MapPin className={`w-5 h-5 ${addressVerified ? 'text-green-500' : 'text-gray-400'}`} />
                    )}
                  </button>
                </div>
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {showMapPreview && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Map Preview</h3>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={coordinates}
                      zoom={15}
                      options={{
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false
                      }}
                    >
                      <Marker
                        position={coordinates}
                        draggable={true}
                        onDragEnd={handleMarkerDragEnd}
                      >
                        {showInfoWindow && (
                          <InfoWindow
                            position={coordinates}
                            onCloseClick={() => setShowInfoWindow(false)}
                          >
                            <div className="text-sm">
                              <p className="font-semibold">{centerName || 'New Center'}</p>
                              <p>{formattedAddress}</p>
                            </div>
                          </InfoWindow>
                        )}
                      </Marker>
                    </GoogleMap>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center bg-gray-100">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                    </div>
                  )}
                  <div className="p-4 bg-blue-50 text-sm text-blue-700">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>Current location:</p>
                        <p className="font-medium mt-1">{formattedAddress}</p>
                        <p className="text-xs mt-2">
                          You can drag the marker to adjust the exact location if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Route</label>
              <select
                {...register('route', { required: 'Route is required' })}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select a route...</option>
                {routes.map(route => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
              {errors.route && (
                <p className="mt-1 text-sm text-red-600">{errors.route.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="Enter email address"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                placeholder="Enter phone number"
                {...register('phone', { required: 'Phone number is required' })}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Person</label>
              <input
                type="text"
                placeholder="Enter contact person name"
                {...register('contactPerson', { required: 'Contact person is required' })}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.contactPerson && (
                <p className="mt-1 text-sm text-red-600">{errors.contactPerson.message}</p>
              )}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            type="submit"
            onClick={handleSubmit(onFormSubmit)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Save Collection Center
          </button>
        </div>
      </div>
    </div>
  );
};