export default function Loading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy aria-label="불러오는 중">
      <div className="flex h-[52px] items-center px-5">
        <div className="h-5 w-28 animate-pulse rounded bg-line" />
      </div>
      <div className="flex-1 border-t border-line bg-surface p-5">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-app" />
          ))}
        </div>
      </div>
    </div>
  );
}
