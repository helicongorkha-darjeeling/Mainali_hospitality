"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type BookingCtx = {
  isOpen: boolean;
  room: string;
  open: (room?: string) => void;
  close: () => void;
};

const Ctx = createContext<BookingCtx | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [room, setRoom] = useState("");

  const open = useCallback((r?: string) => {
    setRoom(r ?? "");
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ isOpen, room, open, close }), [isOpen, room, open, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBooking must be used inside <BookingProvider>");
  return v;
}
