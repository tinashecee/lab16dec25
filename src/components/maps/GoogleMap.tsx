const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.error('Google Maps API key is missing');
}

// Use in LoadScript component
<LoadScript googleMapsApiKey={apiKey || ''}>
  {/* Map components */}
</LoadScript> 