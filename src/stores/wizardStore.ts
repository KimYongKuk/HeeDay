'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorKey } from '@/lib/domain/enums';
import type { ISODate, TemplateSnapshot } from '@/lib/domain/types';

export interface WizardForm {
  name: string;
  startDate: ISODate | '';
  endDate: ISODate | '';
  assignee: string;
  color: ColorKey;
}

/** A task the user added by hand in the wizard (date lives in `placements`). */
export interface WizardExtra {
  key: string;
  title: string;
  checklist: string[];
}

export interface WizardState {
  draftId: string;
  step: 1 | 2 | 3;
  templateId: number | null;
  snapshot: TemplateSnapshot | null;
  form: WizardForm;
  /** draft key -> chosen date */
  placements: Record<string, ISODate>;
  /** template item keys the user excluded */
  removed: string[];
  extras: WizardExtra[];
  hydrated: boolean;

  pickTemplate: (snapshot: TemplateSnapshot, defaults: { name: string; assignee: string }) => void;
  patchForm: (patch: Partial<WizardForm>) => void;
  place: (key: string, date: ISODate) => void;
  placeMany: (entries: Record<string, ISODate>) => void;
  unplace: (key: string) => void;
  remove: (key: string) => void;
  restore: (key: string) => void;
  restoreAll: () => void;
  addExtra: (extra: WizardExtra, date?: ISODate) => void;
  updateExtra: (key: string, patch: Partial<Omit<WizardExtra, 'key'>>) => void;
  removeExtra: (key: string) => void;
  setStep: (step: 1 | 2 | 3) => void;
  reset: () => void;
  setHydrated: () => void;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const EMPTY_FORM: WizardForm = { name: '', startDate: '', endDate: '', assignee: '', color: 'rose' };

function initial() {
  return {
    draftId: newId(),
    step: 1 as const,
    templateId: null,
    snapshot: null,
    form: EMPTY_FORM,
    placements: {} as Record<string, ISODate>,
    removed: [] as string[],
    extras: [] as WizardExtra[],
  };
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initial(),
      hydrated: false,

      pickTemplate: (snapshot, defaults) =>
        set((s) => {
          const same = s.templateId === snapshot.templateId;
          return {
            templateId: snapshot.templateId,
            snapshot,
            placements: same ? s.placements : {},
            removed: same ? s.removed : [],
            extras: same ? s.extras : [],
            form: {
              ...s.form,
              color: same ? s.form.color : snapshot.color,
              name: s.form.name || defaults.name,
              assignee: s.form.assignee || defaults.assignee,
            },
            step: 2,
          };
        }),
      patchForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
      place: (key, date) => set((s) => ({ placements: { ...s.placements, [key]: date } })),
      placeMany: (entries) => set((s) => ({ placements: { ...s.placements, ...entries } })),
      unplace: (key) =>
        set((s) => {
          const next = { ...s.placements };
          delete next[key];
          return { placements: next };
        }),
      remove: (key) => set((s) => ({ removed: s.removed.includes(key) ? s.removed : [...s.removed, key] })),
      restore: (key) => set((s) => ({ removed: s.removed.filter((k) => k !== key) })),
      restoreAll: () => set({ removed: [] }),
      addExtra: (extra, date) =>
        set((s) => ({
          extras: [...s.extras, extra],
          placements: date ? { ...s.placements, [extra.key]: date } : s.placements,
        })),
      updateExtra: (key, patch) =>
        set((s) => ({ extras: s.extras.map((e) => (e.key === key ? { ...e, ...patch } : e)) })),
      removeExtra: (key) =>
        set((s) => {
          const next = { ...s.placements };
          delete next[key];
          return { extras: s.extras.filter((e) => e.key !== key), placements: next };
        }),
      setStep: (step) => set({ step }),
      reset: () => set({ ...initial() }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'heeday.wizard.v2',
      partialize: (s) => ({
        draftId: s.draftId,
        step: s.step,
        templateId: s.templateId,
        snapshot: s.snapshot,
        form: s.form,
        placements: s.placements,
        removed: s.removed,
        extras: s.extras,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
