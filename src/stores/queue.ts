"use client";

import { create } from "zustand";

export type ReviewAction = "approve" | "reject" | "request_changes" | "regenerate";

interface QueueState {
  /** id of the project currently front-of-deck */
  activeId: string | null;
  /** ids the reviewer has acted on this session (cards fly out immediately) */
  reviewed: Record<string, ReviewAction>;
  muted: boolean;
  setActiveId: (id: string | null) => void;
  markReviewed: (id: string, action: ReviewAction) => void;
  unmarkReviewed: (id: string) => void;
  setMuted: (muted: boolean) => void;
}

export const useQueueStore = create<QueueState>()((set) => ({
  activeId: null,
  reviewed: {},
  muted: true,
  setActiveId: (activeId) => set({ activeId }),
  markReviewed: (id, action) => set((s) => ({ reviewed: { ...s.reviewed, [id]: action } })),
  unmarkReviewed: (id) =>
    set((s) => {
      const next = { ...s.reviewed };
      delete next[id];
      return { reviewed: next };
    }),
  setMuted: (muted) => set({ muted }),
}));
