"use client";

import { create } from "zustand";
import type { TimelineDoc } from "@/lib/types";

interface EditorState {
  doc: TimelineDoc | null;
  selectedSceneId: string | null;
  playhead: number;
  playing: boolean;
  dirty: boolean;
  history: TimelineDoc[];
  setDoc: (doc: TimelineDoc, opts?: { dirty?: boolean }) => void;
  updateDoc: (updater: (doc: TimelineDoc) => TimelineDoc) => void;
  selectScene: (id: string | null) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  undo: () => void;
  markSaved: () => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  doc: null,
  selectedSceneId: null,
  playhead: 0,
  playing: false,
  dirty: false,
  history: [],
  setDoc: (doc, opts) => set({ doc, dirty: opts?.dirty ?? false, history: [] }),
  updateDoc: (updater) => {
    const current = get().doc;
    if (!current) return;
    const history = [...get().history.slice(-24), current];
    set({ doc: updater(JSON.parse(JSON.stringify(current))), dirty: true, history });
  },
  selectScene: (selectedSceneId) => set({ selectedSceneId }),
  setPlayhead: (playhead) => set({ playhead }),
  setPlaying: (playing) => set({ playing }),
  undo: () => {
    const history = [...get().history];
    const prev = history.pop();
    if (prev) set({ doc: prev, history, dirty: true });
  },
  markSaved: () => set({ dirty: false }),
  reset: () =>
    set({ doc: null, selectedSceneId: null, playhead: 0, playing: false, dirty: false, history: [] }),
}));
