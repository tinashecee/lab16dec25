interface Location {
  lat: number;
  lng: number;
  id: string;
  priority: 'STAT' | 'Urgent' | 'Normal';
}

export function optimizeRoute(
  driverLocation: Location,
  collections: Location[]
): Location[] {
  // Sort by priority first
  const priorityOrder = { STAT: 0, Urgent: 1, Normal: 2 };
  
  const sortedCollections = [...collections].sort((a, b) => {
    // Priority takes precedence
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, sort by distance from current location
    const distA = calculateDistance(driverLocation, a);
    const distB = calculateDistance(driverLocation, b);
    return distA - distB;
  });

  return sortedCollections;
}

function calculateDistance(point1: Location, point2: Location): number {
  // Haversine formula for calculating distance between two points
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(value: number): number {
  return value * Math.PI / 180;
} 