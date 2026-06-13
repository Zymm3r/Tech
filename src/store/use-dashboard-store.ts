import { create } from "zustand";
import { persist } from "zustand/middleware";
import { APP_VERSION, DEFAULT_PROJECT_CONFIG } from "@/lib/constants";
import { Catalog, ProjectConfig } from "@/types";

type DashboardState = {
  projectConfig: ProjectConfig;
  catalog: Catalog | null;
  loadedFromSpreadsheet: boolean;
  lastSavedMessage: string;
  history: ProjectConfig[];
  setCatalog: (catalog: Catalog, fromSpreadsheet?: boolean) => void;
  setProjectField: (key: keyof Omit<ProjectConfig, "version" | "lastSavedAt">, value: string | string[]) => void;
  setSelectedTechnicianIds: (ids: string[]) => void;
  setSelectedMultiplierIds: (ids: string[]) => void;
  pushSnapshot: () => void;
  undo: () => void;
  reset: () => void;
  importSnapshot: (snapshot: ProjectConfig) => void;
  hydrate: (snapshot: Partial<ProjectConfig>, catalog?: Catalog | null) => void;
  setSavedMessage: (message: string) => void;
  touchSavedAt: () => void;
};

const initialProjectConfig: ProjectConfig = {
  ...DEFAULT_PROJECT_CONFIG,
  version: APP_VERSION
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      projectConfig: initialProjectConfig,
      catalog: null,
      loadedFromSpreadsheet: false,
      lastSavedMessage: "",
      history: [],
      setCatalog: (catalog, fromSpreadsheet = false) =>
        set((state) => ({
          catalog,
          loadedFromSpreadsheet: fromSpreadsheet || state.loadedFromSpreadsheet
        })),
      setProjectField: (key, value) =>
        set((state) => ({
          projectConfig: {
            ...state.projectConfig,
            [key]: value
          } as ProjectConfig
        })),
      setSelectedTechnicianIds: (ids) =>
        set((state) => ({
          projectConfig: {
            ...state.projectConfig,
            selectedTechnicianIds: ids
          }
        })),
      setSelectedMultiplierIds: (ids) =>
        set((state) => ({
          projectConfig: {
            ...state.projectConfig,
            selectedMultiplierIds: ids
          }
        })),
      pushSnapshot: () =>
        set((state) => ({
          history: [...state.history, state.projectConfig].slice(-20)
        })),
      undo: () =>
        set((state) => {
          const history = [...state.history];
          const previous = history.pop();
          if (!previous) return state;
          return {
            history,
            projectConfig: previous
          };
        }),
      reset: () =>
        set({
          projectConfig: initialProjectConfig,
          catalog: null,
          loadedFromSpreadsheet: false,
          lastSavedMessage: "",
          history: []
        }),
      importSnapshot: (snapshot) =>
        set((state) => ({
          projectConfig: {
            ...state.projectConfig,
            ...snapshot,
            version: APP_VERSION,
            lastSavedAt: new Date().toISOString()
          }
        })),
      hydrate: (snapshot, catalog = null) =>
        set((state) => ({
          projectConfig: {
            ...state.projectConfig,
            ...snapshot,
            version: snapshot.version ?? APP_VERSION
          },
          catalog: catalog ?? state.catalog
        })),
      setSavedMessage: (message) => set({ lastSavedMessage: message }),
      touchSavedAt: () =>
        set((state) => ({
          projectConfig: {
            ...state.projectConfig,
            lastSavedAt: new Date().toISOString()
          }
        }))
    }),
    {
      name: "technician-pricing-dashboard-store",
      partialize: (state) => ({
        projectConfig: state.projectConfig,
        catalog: state.catalog,
        history: state.history,
        loadedFromSpreadsheet: state.loadedFromSpreadsheet
      })
    }
  )
);
