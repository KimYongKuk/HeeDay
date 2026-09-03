'use client';

import { PALETTE } from '@/lib/domain/colors';
import type { ProgramListDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { weekSegment } from '@/lib/services/calendarLayout';

export const MAX_LANES = 3;

/** Thin bar per program across its period (start → end) under the day-number row. */
export function LaneLayer({
  week,
  programs,
  lanes,
}: {
  week: ISODate[];
  programs: ProgramListDto[];
  lanes: Map<number, number>;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-y-1"
      style={{ gridAutoRows: '4px' }}
    >
      {programs.flatMap((p) => {
        const lane = lanes.get(p.id);
        if (lane === undefined || lane >= MAX_LANES) return [];
        const seg = weekSegment({ from: p.startDate, to: p.endDate }, week);
        if (!seg) return [];
        return [
          <div
            key={p.id}
            className="h-1"
            title={p.name}
            style={{
              gridColumn: `${seg.colStart + 1} / ${seg.colEnd + 2}`,
              gridRow: lane + 1,
              background: PALETTE[p.color].solid,
              marginLeft: seg.roundedLeft ? 6 : 0,
              marginRight: seg.roundedRight ? 6 : 0,
              borderRadius: `${seg.roundedLeft ? 2 : 0}px ${seg.roundedRight ? 2 : 0}px ${seg.roundedRight ? 2 : 0}px ${seg.roundedLeft ? 2 : 0}px`,
            }}
          />,
        ];
      })}
    </div>
  );
}
