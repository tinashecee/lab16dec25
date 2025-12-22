import { 
  collection, 
  getDocs, 
  setDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  getDoc,
  addDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface WorkingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isOpen: boolean;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface Holiday {
  id?: string;
  date: Timestamp;
  name: string;
  description?: string;
  isRecurringYearly: boolean;
}

export interface CalendarSettings {
  id?: string;
  workingHours: WorkingHours[];
  updatedAt?: Timestamp;
}

const SETTINGS_DOC_ID = 'calendar_settings';
const HOLIDAYS_COLLECTION = 'holidays';

export const calendarSettingsService = {
  async getSettings(): Promise<CalendarSettings | null> {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as CalendarSettings;
      }
      
      // Create default settings if none exist
      const defaultSettings = {
        workingHours: [
          { dayOfWeek: 0, isOpen: false, startTime: '09:00', endTime: '17:00' }, // Sunday
          { dayOfWeek: 1, isOpen: true, startTime: '09:00', endTime: '17:00' },  // Monday
          { dayOfWeek: 2, isOpen: true, startTime: '09:00', endTime: '17:00' },  // Tuesday
          { dayOfWeek: 3, isOpen: true, startTime: '09:00', endTime: '17:00' },  // Wednesday
          { dayOfWeek: 4, isOpen: true, startTime: '09:00', endTime: '17:00' },  // Thursday
          { dayOfWeek: 5, isOpen: true, startTime: '09:00', endTime: '17:00' },  // Friday
          { dayOfWeek: 6, isOpen: false, startTime: '09:00', endTime: '17:00' }  // Saturday
        ]
      };

      // Save default settings
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), {
        ...defaultSettings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return defaultSettings;
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
      throw error;
    }
  },

  async updateSettings(settings: CalendarSettings): Promise<void> {
    try {
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      throw error;
    }
  },

  async getHolidays(year?: number): Promise<Holiday[]> {
    try {
      let constraints = [orderBy('date', 'asc')];
      
      if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        constraints.push(
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
      }

      const q = query(collection(db, HOLIDAYS_COLLECTION), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Holiday[];
    } catch (error) {
      console.error('Error fetching holidays:', error);
      throw error;
    }
  },

  async addHoliday(holiday: Omit<Holiday, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, HOLIDAYS_COLLECTION), {
        ...holiday,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding holiday:', error);
      throw error;
    }
  },

  async deleteHoliday(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, HOLIDAYS_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting holiday:', error);
      throw error;
    }
  },

  async updateHoliday(id: string, updates: Partial<Holiday>): Promise<void> {
    try {
      await updateDoc(doc(db, HOLIDAYS_COLLECTION, id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating holiday:', error);
      throw error;
    }
  }
}; 