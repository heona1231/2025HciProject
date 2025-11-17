import React, { createContext, useContext, useState } from 'react';
import { EventData } from '../data/types';

type EventContextType = {
  eventData: EventData | null;
  setEventData: (d: EventData | null) => void;
  imageAnalysisData: any | null;
  setImageAnalysisData: (d: any | null) => void;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [imageAnalysisData, setImageAnalysisData] = useState<any | null>(null);

  return (
    <EventContext.Provider value={{ eventData, setEventData, imageAnalysisData, setImageAnalysisData }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEventContext must be used within EventProvider');
  return ctx;
};

export default EventContext;
