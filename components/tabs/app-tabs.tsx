import type { AppTab } from "@/lib/types/article";

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: "top", label: "注目記事" },
  { id: "official", label: "公式情報" },
  { id: "saved", label: "保存済み" }
];

export function AppTabs({
  activeTab,
  onChange
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-2xl border border-line bg-white p-1 sm:w-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
            activeTab === tab.id
              ? "bg-accent text-white shadow-sm"
              : "text-ink/72 hover:text-accent"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
