import type { AppTab } from "@/lib/types/article";

const tabs: Array<{ id: AppTab; label: string; hint: string }> = [
  { id: "top", label: "注目記事", hint: "Hacker News" },
  { id: "official", label: "公式情報", hint: "一次情報" },
  { id: "saved", label: "保存済み", hint: "あとで読む" }
];

export function AppTabs({
  activeTab,
  onChange
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  return (
    <nav
      aria-label="主要タブ"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-[28px] border border-line/90 bg-card/92 p-2 shadow-panel backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`min-h-14 rounded-[20px] px-3 py-2 text-center transition ${
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : "bg-white/72 text-ink/72 hover:bg-white hover:text-accent"
                }`}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span
                  className={`mt-1 block text-[11px] ${
                    isActive ? "text-white/78" : "text-ink/46"
                  }`}
                >
                  {tab.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
