'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type Aviso = { id: number; texto: string; tom: 'ok' | 'erro' };
const Ctx = createContext<(texto: string, tom?: 'ok' | 'erro') => void>(() => {});

export const useAviso = () => useContext(Ctx);

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tom: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, tom }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0">
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={`pointer-events-auto rounded border px-4 py-3 text-sm shadow-[0_2px_0_rgba(20,32,27,0.12)] ${
              a.tom === 'erro'
                ? 'border-linha/40 bg-linha-clara text-linha'
                : 'border-mata bg-mata text-papel'
            }`}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
