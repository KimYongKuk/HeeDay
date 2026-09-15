import { MapPin, TreePalm, UserRoundX } from 'lucide-react';
import { ABSENCE_KIND_LABEL } from '@/lib/domain/labels';
import type { AbsenceKind } from '@/lib/domain/enums';
import { cn } from '@/lib/utils';

export const ABSENCE_ICON: Record<AbsenceKind, typeof MapPin> = {
  LEAVE: TreePalm,
  TRIP: MapPin,
  OTHER: UserRoundX,
};

/** A date is covered by one absence; the calendar only needs its kind and name. */
export interface AbsenceMark {
  kind: AbsenceKind;
  name: string;
}

/**
 * Small icon (+ optional name) placed beside a day number so a month can be scanned for days the
 * staff is away. `label` is dropped when a holiday name already takes the row.
 */
export function AbsenceBadge({
  mark,
  label = true,
  className,
  iconClassName = 'size-3',
}: {
  mark: AbsenceMark;
  label?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = ABSENCE_ICON[mark.kind];
  const title = `${ABSENCE_KIND_LABEL[mark.kind]} · ${mark.name}`;
  return (
    <span
      className={cn('text-away flex min-w-0 items-center gap-1', className)}
      title={title}
      aria-label={title}
    >
      <Icon className={cn('shrink-0', iconClassName)} strokeWidth={2.25} />
      {label ? <span className="truncate">{mark.name}</span> : null}
    </span>
  );
}
