'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ASSIGNEE } from '@/lib/domain/defaults';
import type { ColorKey } from '@/lib/domain/enums';
import type { ISODate, TemplateSnapshot } from '@/lib/domain/types';
import { baseKeyOf, occurrenceKey } from '@/lib/services/placement';

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
  /** base key -> keys of the additional 회차 (occurrences) the user added, in creation order */
  occurrences: Record<string, string[]>;
  /** The name the wizard last proposed. Lets us tell an untouched name from a hand-typed one. */
  nameSuggestion: string;
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
  /** Add one more 회차 of the task behind `key` (any draft in its group); returns the new key. */
  addOccurrence: (key: string, date?: ISODate) => string;
  removeOccurrence: (key: string) => void;
  setStep: (step: 1 | 2 | 3) => void;
  reset: () => void;
  setHydrated: () => void;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const EMPTY_FORM: WizardForm = {
  name: '',
  startDate: '',
  endDate: '',
  assignee: DEFAULT_ASSIGNEE,
  color: 'rose',
};

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
    occurrences: {} as Record<string, string[]>,
    nameSuggestion: '',
  };
}

/**
 * How much placement work a draft holds. Switching to another template throws all of it away,
 * so the wizard confirms first when this is above zero.
 */
export function draftWorkCount(s: WizardState): number {
  return Object.keys(s.placements).length + s.extras.length + s.removed.length;
}

/** Drop `baseKey` and all of its 회차 from placements/occurrences. */
function dropGroup(s: Pick<WizardState, 'placements' | 'occurrences'>, baseKey: string) {
  const placements = { ...s.placements };
  delete placements[baseKey];
  for (const k of s.occurrences[baseKey] ?? []) delete placements[k];
  const occurrences = { ...s.occurrences };
  delete occurrences[baseKey];
  return { placements, occurrences };
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initial(),
      hydrated: false,

      /**
       * Switching to another template drops everything that belonged to the old one (placed
       * tasks, 회차, exclusions, hand-added 할 일) and takes the new template's color. The
       * 일정 이름 follows the new template unless the user typed their own. 기간 and 담당자
       * describe the program rather than the template, so they carry over; the caller confirms
       * and reports both halves.
       */
      pickTemplate: (snapshot, defaults) =>
        set((s) => {
          const same = s.templateId === snapshot.templateId;
          const nameTouched = s.form.name !== '' && s.form.name !== s.nameSuggestion;
          return {
            templateId: snapshot.templateId,
            snapshot,
            placements: same ? s.placements : {},
            removed: same ? s.removed : [],
            extras: same ? s.extras : [],
            occurrences: same ? s.occurrences : {},
            nameSuggestion: defaults.name,
            form: {
              ...s.form,
              color: same ? s.form.color : snapshot.color,
              name: nameTouched ? s.form.name : defaults.name,
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
      remove: (key) =>
        set((s) => ({
          removed: s.removed.includes(key) ? s.removed : [...s.removed, key],
          ...dropGroup(s, key),
        })),
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
        set((s) => ({ extras: s.extras.filter((e) => e.key !== key), ...dropGroup(s, key) })),
      addOccurrence: (key, date) => {
        const baseKey = baseKeyOf(key);
        const next = occurrenceKey(baseKey, newId());
        set((s) => ({
          occurrences: { ...s.occurrences, [baseKey]: [...(s.occurrences[baseKey] ?? []), next] },
          placements: date ? { ...s.placements, [next]: date } : s.placements,
        }));
        return next;
      },
      removeOccurrence: (key) =>
        set((s) => {
          const baseKey = baseKeyOf(key);
          const placements = { ...s.placements };
          delete placements[key];
          return {
            placements,
            occurrences: {
              ...s.occurrences,
              [baseKey]: (s.occurrences[baseKey] ?? []).filter((k) => k !== key),
            },
          };
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
        occurrences: s.occurrences,
        nameSuggestion: s.nameSuggestion,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
