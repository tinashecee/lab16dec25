import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Center {
  id: string;
  value: string;
  label: string;
  address: string;
  phone: string;
  contactPerson: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'inactive';
}

export function useCollectionCenters(searchTerm: string = '') {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCenters = async () => {
      setLoading(true);
      setError(null);
      try {
        const centersRef = collection(db, 'centers');
        const snapshot = await getDocs(centersRef);
        const fetchedCenters = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              value: doc.id,
              label: data.name || data.docFullName || data.centerName || 'Unknown Center',
              address: data.docAddress || '',
              phone: data.docContact || '',
              contactPerson: data.contactPerson || '',
              coordinates: {
                lat: data.coordinates?.lat || 0,
                lng: data.coordinates?.lng || 0
              },
              status: data.status || 'active'
            } as Center;
          })
          .filter(center => 
            !searchTerm || center.label.toLowerCase().includes(searchTerm.toLowerCase())
          );

        console.log('Fetched centers:', fetchedCenters);
        setCenters(fetchedCenters);
      } catch (error) {
        console.error('Error fetching centers:', error);
        setError('Failed to fetch centers');
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, [searchTerm]);

  return { centers, loading, error };
} 