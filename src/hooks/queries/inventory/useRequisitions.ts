import { useQuery } from '@tanstack/react-query';
import { getRequisitions, type Requisition } from '../../../lib/firestore/inventory';

export function useRequisitionsForUser(userName?: string) {
  return useQuery<Requisition[]>({
    queryKey: ['inventory', 'requisitions', { userName }],
    queryFn: () => getRequisitions(undefined, userName),
    enabled: Boolean(userName),
  });
}


