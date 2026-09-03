export const qk = {
  categories: () => ['categories'] as const,
  actionItems: (filter?: { categoryId?: number }) => ['action-items', filter ?? {}] as const,
  actionItem: (id: number) => ['action-items', id] as const,
  templates: () => ['templates'] as const,
  template: (id: number) => ['templates', id] as const,
  templateSnapshot: (id: number) => ['templates', id, 'snapshot'] as const,
  programs: (filter?: { status?: string }) => ['programs', filter ?? {}] as const,
  program: (id: number) => ['programs', id] as const,
  tasks: (range: { from: string; to: string; programId?: number }) => ['tasks', 'range', range] as const,
  closures: (range: { from?: string; to?: string }) => ['closures', range] as const,
};
