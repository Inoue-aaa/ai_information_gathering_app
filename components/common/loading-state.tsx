export function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[24px] border border-line bg-white p-5"
        >
          <div className="h-4 w-36 rounded-full bg-fog" />
          <div className="mt-5 h-7 w-4/5 rounded-full bg-fog" />
          <div className="mt-4 h-4 w-full rounded-full bg-fog" />
          <div className="mt-2 h-4 w-2/3 rounded-full bg-fog" />
          <div className="mt-6 h-10 w-52 rounded-full bg-fog" />
        </div>
      ))}
    </div>
  );
}
