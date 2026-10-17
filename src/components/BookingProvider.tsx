"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type BookingCtx = {
  isOpen: boolean;
  /** true once the sheet has been opened (the form is mounted from then on, client-side only) */
  everOpened: boolean;
  room: string;
  open: (room?: string) => void;
  close: () => void;
};

const Ctx = createContext<BookingCtx | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [room, setRoom] = useState("");

  const open = useCallback((r?: string) => {
    setRoom(r ?? "");
    setEverOpened(true);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ isOpen, everOpened, room, open, close }), [isOpen, everOpened, room, open, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBooking must be used inside <BookingProvider>");
  return v;
}
