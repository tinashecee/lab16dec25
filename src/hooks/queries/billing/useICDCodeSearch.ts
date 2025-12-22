import { useQueryClient } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export interface ICDOption {
  value: string;
  label: string;
  description: string;
}

export function useICDCodeSearch() {
  const queryClient = useQueryClient();

  async function fetchCodes(inputValue: string): Promise<ICDOption[]> {
    const icdRef = collection(db, 'icd_codes');
    const snapshot = await getDocs(icdRef);
    const codes: ICDOption[] = snapshot.docs
      .map((doc) => ({
        value: String(doc.data().code ?? ''),
        label: `${doc.data().code ?? ''} - ${doc.data().description ?? ''}`,
        description: String(doc.data().description ?? ''),
      }))
      .filter((code) => code.label.toLowerCase().includes(inputValue.toLowerCase()));
    return codes;
  }

  async function searchICDCodes(inputValue: string): Promise<ICDOption[]> {
    return queryClient.fetchQuery({
      queryKey: ['billing', 'icdCodes', inputValue || ''],
      queryFn: () => fetchCodes(inputValue || ''),
      staleTime: 10 * 60 * 1000,
    });
  }

  return { searchICDCodes };
}


