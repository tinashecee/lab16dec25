import { useQuery } from '@tanstack/react-query';
import { getProducts, type Product } from '../../../lib/firestore/inventory';

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['inventory', 'products'],
    queryFn: () => getProducts(),
  });
}


