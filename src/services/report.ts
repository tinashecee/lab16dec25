import { getFirestore, collection, addDoc, getDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface Report {
  id: string;
  date: Date;
  title: string;
  content: string;
}

interface ReportService {
  generateReport(report: Report): Promise<boolean>;
  generateAdminReport(report: Report):  Promise<boolean>;
  getReport(id: string): Promise<Report>;
  deleteReport(id: string):  Promise<boolean>;
}

export const reportService: ReportService = {
  async generateReport(report: Report): Promise<boolean> {
    try {
      const firestore = getFirestore();
      const docRef = await addDoc(collection(firestore, 'reports'), {
        ...report,
        createdAt: serverTimestamp()
      });
      return !!docRef.id;
    } catch (error) {
      console.error('Error generating report:', error);
      return false;
    }
  },

  async generateAdminReport(report: Report): Promise<boolean> {
    try {
      const firestore = getFirestore();
      const docRef = await addDoc(collection(firestore, 'admin_reports'), {
        ...report,
        createdAt: serverTimestamp()
      });
      return !!docRef.id;
    } catch (error) {
      console.error('Error generating admin report:', error);
      return false;
    }
  },

  async getReport(id: string): Promise<Report> {
    try {
      const firestore = getFirestore();
      const docRef = doc(firestore, 'reports', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Report not found');
      }
      return docSnap.data() as Report;
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  },

  async deleteReport(id: string): Promise<boolean> {
    try {
      const firestore = getFirestore();
      await deleteDoc(doc(firestore, 'reports', id));
      return true;
    } catch (error) {
      console.error('Error deleting report:',  error);
      return false;
    }
  }
};
