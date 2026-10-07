import type { TaskStatus } from './enums';

/** Order the status box cycles through on each click: 대기 → 진행 중 → 완료 → 대기. */
export function nextTaskStatus(s: TaskStatus): TaskStatus {
  return s === 'TODO' ? 'DOING' : s === 'DOING' ? 'DONE' : 'TODO';
}

const RANK: Record<TaskStatus, number> = { DOING: 0, TODO: 1, DONE: 2 };

/** Sort key for day lists: 진행 중 first, then 대기, then 완료. */
export function taskStatusRank(t: { status: TaskStatus }): number {
  return RANK[t.status];
}
