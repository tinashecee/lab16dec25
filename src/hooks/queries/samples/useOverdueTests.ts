import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export interface OverdueTest {
  accessionNumber: string;
  patientName: string;
  testName: string;
  targetTAT: string;
  timeLapsed: string;
  comment: string;
}

export function useOverdueTests() {
  return useQuery<OverdueTest[]>({
    queryKey: ['samples', 'overdueTests'],
    queryFn: async () => {
      const tatQ = query(collection(db, 'testTATTracking'), where('status', '!=', 'delivered'));
      const tatSnap = await getDocs(tatQ);
      const tests: OverdueTest[] = [];

      for (const docSnap of tatSnap.docs) {
        const tat = docSnap.data() as any;
        let patientName = '';
        let accessionNumber = tat.sampleId || '';
        let deliveredAt = '';
        let sampleStatus = '';
        try {
          if (tat.sampleId) {
            const sampleDoc = await getDoc(doc(db, 'collectionRequests', tat.sampleId));
            if (sampleDoc.exists()) {
              const sample = sampleDoc.data() as any;
              patientName = sample.patientName || sample.labPatientId || '';
              accessionNumber = sample.accession_number || tat.sampleId;
              deliveredAt = sample.delivered_at || '';
              sampleStatus = sample.status || '';
            }
          }
        } catch {}

        let testName = '';
        let targetTAT = '';
        let targetTATMinutes = 0;
        try {
          if (tat.testID) {
            const testDoc = await getDoc(doc(db, 'tests', tat.testID.toString()));
            if (testDoc.exists()) {
              const test = testDoc.data() as any;
              testName = test.testName || '';
              if (test.targetTATMinutes) {
                targetTATMinutes = Number(test.targetTATMinutes);
                targetTAT = `${test.targetTATMinutes} min`;
              } else if (tat.targetTATMinutes) {
                targetTATMinutes = Number(tat.targetTATMinutes);
                targetTAT = `${tat.targetTATMinutes} min`;
              }
            }
          }
        } catch {}

        let timeLapsed = '';
        let timeLapsedMinutes = 0;
        if (tat.accessionDate) {
          const start = new Date(tat.accessionDate).getTime();
          let end = Date.now();
          if (deliveredAt) {
            end = new Date(deliveredAt).getTime();
          } else if (tat.completionDate) {
            end = new Date(tat.completionDate).getTime();
          }
          const diff = Math.max(0, end - start);
          const mins = Math.floor(diff / 60000);
          timeLapsedMinutes = mins;
          const hours = Math.floor(mins / 60);
          const minPart = mins % 60;
          timeLapsed = hours > 0 ? `${hours}h ${minPart}m` : `${minPart}m`;
        }

        if (targetTATMinutes > 0 && timeLapsedMinutes > targetTATMinutes && sampleStatus !== 'delivered' && sampleStatus !== 'completed') {
          tests.push({
            accessionNumber,
            patientName,
            testName,
            targetTAT,
            timeLapsed,
            comment: tat.comment || '',
          });
        }
      }

      return tests;
    },
    staleTime: 60_000,
  });
}


