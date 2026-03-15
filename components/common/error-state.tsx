export function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-red-200 bg-red-50 px-6 py-10">
      <h3 className="text-lg font-semibold text-red-900">取得に失敗しました</h3>
      <p className="mt-3 text-sm leading-6 text-red-800/90">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
      >
        再試行
      </button>
    </div>
  );
}
