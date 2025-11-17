import React, { createContext, useContext, useState } from 'react';
import { EventData } from '../data/types';

export type GoodsItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  keyword: string;
  searchCount: number;
};

type EventContextType = {
  eventData: EventData | null;
  setEventData: (d: EventData | null) => void;
  imageAnalysisData: any | null;
  setImageAnalysisData: (d: any | null) => void;
  myGoods: GoodsItem[];
  addGoods: (goods: GoodsItem) => void;
  removeGoods: (id: number) => void;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [imageAnalysisData, setImageAnalysisData] = useState<any | null>(null);
  const [myGoods, setMyGoods] = useState<GoodsItem[]>([]);

  const addGoods = (goods: GoodsItem) => {
    setMyGoods((prev) => {
      if (prev.length >= 3) {
        return prev; // 3개 이상이면 추가하지 않음
      }
      return [...prev, goods];
    });
  };

  const removeGoods = (id: number) => {
    setMyGoods((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <EventContext.Provider value={{ eventData, setEventData, imageAnalysisData, setImageAnalysisData, myGoods, addGoods, removeGoods }}>
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
