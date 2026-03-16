import { act, renderHook } from "@testing-library/react";
import { useQueryParams } from "@/hooks/use-query-params";

const mockReplace = vi.fn();
let mockPathname = "/dashboard";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe("useQueryParams", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPathname = "/dashboard";
    mockSearchParams = new URLSearchParams();
  });

  it("tab / q / period / sort / read / source を正しく parse できる", () => {
    mockSearchParams = new URLSearchParams(
      "tab=official&q=gemini&period=30&sort=comments&read=unread&source=meta"
    );

    const { result } = renderHook(() => useQueryParams());

    expect(result.current.tab).toBe("official");
    expect(result.current.q).toBe("gemini");
    expect(result.current.period).toBe(30);
    expect(result.current.sort).toBe("comments");
    expect(result.current.readFilter).toBe("unread");
    expect(result.current.officialSource).toBe("meta");
  });

  it("無効な query 値は安全に fallback する", () => {
    mockSearchParams = new URLSearchParams(
      "tab=unknown&q=&period=999&sort=invalid&read=nope&source=other"
    );

    const { result } = renderHook(() => useQueryParams());

    expect(result.current.tab).toBe("top");
    expect(result.current.q).toBe("");
    expect(result.current.period).toBe(7);
    expect(result.current.sort).toBe("hot");
    expect(result.current.readFilter).toBe("all");
    expect(result.current.officialSource).toBe("all");
  });

  it("setTab は既存 query を保ちながら tab だけ更新する", () => {
    mockSearchParams = new URLSearchParams("q=llm&period=30&sort=newest");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setTab("saved");
    });

    expectReplaceUrl("/dashboard?q=llm&period=30&sort=newest&tab=saved");
  });

  it("setPeriod は無効値を fallback し、既存 query を保つ", () => {
    mockSearchParams = new URLSearchParams("tab=top&q=ai&read=unread");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setPeriod("999");
    });

    expectReplaceUrl("/dashboard?tab=top&q=ai&read=unread&period=7");
  });

  it("setReadFilter は正しい read 値を router.replace に反映する", () => {
    mockSearchParams = new URLSearchParams("tab=official&source=openai");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setReadFilter("read");
    });

    expectReplaceUrl("/dashboard?tab=official&source=openai&read=read");
  });

  it("setSort は無効値を hot に fallback して反映する", () => {
    mockSearchParams = new URLSearchParams("tab=top&period=3");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setSort("not-a-sort");
    });

    expectReplaceUrl("/dashboard?tab=top&period=3&sort=hot");
  });

  it("setOfficialSource は source を更新し既存 query を保つ", () => {
    mockSearchParams = new URLSearchParams("tab=official&q=agents");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setOfficialSource("google");
    });

    expectReplaceUrl("/dashboard?tab=official&q=agents&source=google");
  });

  it("setQuery は空文字のとき q を削除し、未指定でも壊れない", () => {
    mockSearchParams = new URLSearchParams("tab=top&q=claude&period=7");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setQuery("");
    });

    expectReplaceUrl("/dashboard?tab=top&period=7");
  });

  it("setQuery は空でない値を反映し、他の query を維持する", () => {
    mockSearchParams = new URLSearchParams("tab=official&source=meta&read=all");

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setQuery("open source");
    });

    expectReplaceUrl("/dashboard?tab=official&source=meta&read=all&q=open+source");
  });
});

function expectReplaceUrl(expectedUrl: string) {
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith(expectedUrl, { scroll: false });
}
