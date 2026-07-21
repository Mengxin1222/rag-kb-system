import { createContext, useContext, useState, type ReactNode } from 'react';

interface KBSelectState {
  selectedKBId: number | null;
  setSelectedKBId: (id: number | null) => void;
}

const KBSelectContext = createContext<KBSelectState>({ selectedKBId: null, setSelectedKBId: () => {} });

export function KBSelectProvider({ children }: { children: ReactNode }) {
  const [selectedKBId, setSelectedKBId] = useState<number | null>(null);
  return (
    <KBSelectContext.Provider value={{ selectedKBId, setSelectedKBId }}>
      {children}
    </KBSelectContext.Provider>
  );
}

export function useKBSelect() {
  return useContext(KBSelectContext);
}
