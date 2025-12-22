// Simple event emitter for application events
type EventCallback = () => void;

class EventService {
  private listeners: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string): void {
    const eventListeners = this.listeners[event];
    
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

export const EVENTS = {
  CALL_LOGGED: 'call_logged',
  SAMPLE_REQUESTED: 'sample_requested',
  WALK_IN_REGISTERED: 'walk_in_registered'
};

export const eventService = new EventService(); 