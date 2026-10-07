import { describe, expect, it } from 'vitest';
import { nextTaskStatus, taskStatusRank } from './taskStatus';

describe('taskStatus', () => {
  it('cycles 대기 → 진행 중 → 완료 → 대기', () => {
    expect(nextTaskStatus('TODO')).toBe('DOING');
    expect(nextTaskStatus('DOING')).toBe('DONE');
    expect(nextTaskStatus('DONE')).toBe('TODO');
  });

  it('sorts 진행 중 before 대기 before 완료', () => {
    const sorted = (['DONE', 'TODO', 'DOING'] as const)
      .map((status) => ({ status }))
      .sort((a, b) => taskStatusRank(a) - taskStatusRank(b))
      .map((t) => t.status);
    expect(sorted).toEqual(['DOING', 'TODO', 'DONE']);
  });
});
