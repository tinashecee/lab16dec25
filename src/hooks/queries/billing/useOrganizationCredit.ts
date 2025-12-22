import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export function useOrganizationCredit(organizationName?: string) {
  return useQuery<number>({
    queryKey: ['billing', 'organizationCredit', organizationName ?? ''],
    queryFn: async () => {
      if (!organizationName) return 0;
      const organizationsRef = collection(db, 'organizations');
      const q = query(organizationsRef, where('name', '==', organizationName));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const orgData = snapshot.docs[0].data() as any;
        return Number(orgData.credit || 0);
      }
      return 0;
    },
    enabled: Boolean(organizationName),
    staleTime: 10 * 60 * 1000,
  });
}


