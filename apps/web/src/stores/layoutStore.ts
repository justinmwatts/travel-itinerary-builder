// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { create } from "zustand";
import { DEFAULT_LAYOUT_CONFIG, type LayoutConfig } from "@travel/shared";

// Zustand owns the unsaved layout-editor config: pure client state that drives
// the live preview instantly and is persisted via PATCH only on publish/save.
interface LayoutState {
  config: LayoutConfig;
  setConfig: (config: LayoutConfig) => void;
  updateField: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  reset: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  config: DEFAULT_LAYOUT_CONFIG,
  setConfig: (config) => set({ config }),
  updateField: (key, value) => set((s) => ({ config: { ...s.config, [key]: value } })),
  reset: () => set({ config: DEFAULT_LAYOUT_CONFIG }),
}));
