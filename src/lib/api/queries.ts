'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { qk } from './keys';
import type {
  ActionItemDetailDto,
  ActionItemDto,
  ApproveResultDto,
  CalendarTaskDto,
  CategoryDto,
  ClosureDayDto,
  ProgramDetailDto,
  ProgramListDto,
  TemplateDetailDto,
  TemplateListDto,
} from '@/lib/domain/dto';
import type { ProgramStatus } from '@/lib/domain/enums';
import type { ISODate, TemplateSnapshot } from '@/lib/domain/types';
import type {
  ActionItemInput,
  ClosureInput,
  ProgramApproveInput,
  TaskCreateInput,
  TaskPatchInput,
  TemplateInput,
} from '@/lib/domain/zod';

// ---------- categories ----------

export function useCategories() {
  return useQuery({ queryKey: qk.categories(), queryFn: () => api<CategoryDto[]>('/api/categories') });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<{ id: number }>('/api/categories', { method: 'POST', json: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// ---------- action items ----------

export function useActionItems(filter?: { categoryId?: number }, enabled = true) {
  const qs = filter?.categoryId ? `?categoryId=${filter.categoryId}` : '';
  return useQuery({
    queryKey: qk.actionItems(filter),
    queryFn: () => api<ActionItemDto[]>(`/api/action-items${qs}`),
    enabled,
  });
}

export function useActionItem(id: number | null) {
  return useQuery({
    queryKey: qk.actionItem(id ?? 0),
    queryFn: () => api<ActionItemDetailDto>(`/api/action-items/${id}`),
    enabled: id !== null,
  });
}

function invalidateLibrary(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['action-items'] });
  qc.invalidateQueries({ queryKey: ['categories'] });
  qc.invalidateQueries({ queryKey: ['templates'] });
}

export function useCreateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ActionItemInput) => api<{ id: number }>('/api/action-items', { method: 'POST', json: input }),
    onSuccess: () => invalidateLibrary(qc),
  });
}

export function useUpdateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ActionItemInput> }) =>
      api<ActionItemDetailDto>(`/api/action-items/${id}`, { method: 'PATCH', json: input }),
    onSuccess: () => invalidateLibrary(qc),
  });
}

export function useDeleteActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/action-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateLibrary(qc),
  });
}

// ---------- templates ----------

export function useTemplates(enabled = true) {
  return useQuery({ queryKey: qk.templates(), queryFn: () => api<TemplateListDto[]>('/api/templates'), enabled });
}

export function useTemplate(id: number | null) {
  return useQuery({
    queryKey: qk.template(id ?? 0),
    queryFn: () => api<TemplateDetailDto>(`/api/templates/${id}`),
    enabled: id !== null,
  });
}

export function fetchTemplateSnapshot(id: number) {
  return api<TemplateSnapshot>(`/api/templates/${id}/snapshot`);
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateInput) => api<{ id: number }>('/api/templates', { method: 'POST', json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TemplateInput }) =>
      api<TemplateDetailDto>(`/api/templates/${id}`, { method: 'PUT', json: input }),
    onSuccess: (data) => {
      qc.setQueryData(qk.template(data.id), data);
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['action-items'] });
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<{ id: number }>(`/api/templates/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['action-items'] });
    },
  });
}

// ---------- closures ----------

export function useClosures(range: { from?: ISODate; to?: ISODate }, enabled = true) {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const qs = params.size > 0 ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: qk.closures(range),
    queryFn: () => api<ClosureDayDto[]>(`/api/closures${qs}`),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClosureInput) => api<{ id: number }>('/api/closures', { method: 'POST', json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['closures'] }),
  });
}

export function useDeleteClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/closures/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['closures'] }),
  });
}

// ---------- programs ----------

export function usePrograms(filter?: { status?: ProgramStatus }, enabled = true) {
  const qs = filter?.status ? `?status=${filter.status}` : '';
  return useQuery({
    queryKey: qk.programs(filter),
    queryFn: () => api<ProgramListDto[]>(`/api/programs${qs}`),
    enabled,
  });
}

export function useProgram(id: number | null) {
  return useQuery({
    queryKey: qk.program(id ?? 0),
    queryFn: () => api<ProgramDetailDto>(`/api/programs/${id}`),
    enabled: id !== null,
  });
}

function invalidateSchedule(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['programs'] });
  qc.invalidateQueries({ queryKey: ['tasks'] });
  qc.invalidateQueries({ queryKey: ['templates'] });
}

export function useApproveProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProgramApproveInput) => api<ApproveResultDto>('/api/programs', { method: 'POST', json: input }),
    onSuccess: () => invalidateSchedule(qc),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/programs/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateSchedule(qc),
  });
}

// ---------- tasks ----------

export function useTasks(range: { from: ISODate; to: ISODate; programId?: number }) {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  if (range.programId) params.set('programId', String(range.programId));
  return useQuery({
    queryKey: qk.tasks(range),
    queryFn: () => api<CalendarTaskDto[]>(`/api/tasks?${params.toString()}`),
  });
}

type TaskListSnapshot = Array<[readonly unknown[], CalendarTaskDto[] | undefined]>;

/** Optimistically patch a task inside every cached task list. */
function patchTaskCaches(qc: ReturnType<typeof useQueryClient>, id: number, patch: Partial<CalendarTaskDto>) {
  const previous = qc.getQueriesData<CalendarTaskDto[]>({ queryKey: ['tasks'] });
  qc.setQueriesData<CalendarTaskDto[]>({ queryKey: ['tasks'] }, (old) =>
    old ? old.map((t) => (t.id === id ? { ...t, ...patch } : t)) : old,
  );
  return previous as TaskListSnapshot;
}

function restoreTaskCaches(qc: ReturnType<typeof useQueryClient>, previous?: TaskListSnapshot) {
  previous?.forEach(([key, data]) => qc.setQueryData(key, data));
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: TaskPatchInput }) =>
      api<CalendarTaskDto>(`/api/tasks/${id}`, { method: 'PATCH', json: patch }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const optimistic: Partial<CalendarTaskDto> = { ...patch };
      if (patch.done !== undefined) optimistic.doneAt = patch.done ? new Date().toISOString() : null;
      return { previous: patchTaskCaches(qc, id, optimistic) };
    },
    onError: (_err, _vars, ctx) => restoreTaskCaches(qc, ctx?.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => api<CalendarTaskDto>('/api/tasks', { method: 'POST', json: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const previous = qc.getQueriesData<CalendarTaskDto[]>({ queryKey: ['tasks'] }) as TaskListSnapshot;
      qc.setQueriesData<CalendarTaskDto[]>({ queryKey: ['tasks'] }, (old) => old?.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => restoreTaskCaches(qc, ctx?.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}
