import { act, fireEvent, render, screen } from "@testing-library/react";
import { SearchField } from "@/components/filters/search-field";

describe("SearchField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期値を表示し、外部 value の更新を反映する", () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <SearchField
        value="OpenAI"
        onCommit={onCommit}
        placeholder="タイトルで検索"
      />
    );

    const input = screen.getByPlaceholderText("タイトルで検索");
    expect(input).toHaveValue("OpenAI");

    rerender(
      <SearchField
        value="Gemini"
        onCommit={onCommit}
        placeholder="タイトルで検索"
      />
    );

    expect(input).toHaveValue("Gemini");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("通常入力は debounce 後に一度だけ commit される", () => {
    const onCommit = vi.fn();

    render(
      <SearchField value="" onCommit={onCommit} placeholder="タイトルで検索" />
    );

    const input = screen.getByPlaceholderText("タイトルで検索");

    fireEvent.change(input, { target: { value: "Open" } });
    fireEvent.change(input, { target: { value: "OpenAI" } });

    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("OpenAI");
  });

  it("IME composition 中は commit せず、compositionend 後に確定値だけを反映する", () => {
    const onCommit = vi.fn();

    render(
      <SearchField value="" onCommit={onCommit} placeholder="タイトルで検索" />
    );

    const input = screen.getByPlaceholderText("タイトルで検索");

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "あ" } });
    fireEvent.change(input, { target: { value: "あい" } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue("あい");

    fireEvent.compositionEnd(input, {
      currentTarget: { value: "あいうえお" },
      target: { value: "あいうえお" },
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("あいうえお");

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("blur 時は debounce を待たずに即時 commit され、二重実行しない", () => {
    const onCommit = vi.fn();

    render(
      <SearchField value="" onCommit={onCommit} placeholder="タイトルで検索" />
    );

    const input = screen.getByPlaceholderText("タイトルで検索");

    fireEvent.change(input, { target: { value: "Claude" } });
    fireEvent.blur(input, { currentTarget: { value: "Claude" } });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("Claude");

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("composition 中の blur では commit しない", () => {
    const onCommit = vi.fn();

    render(
      <SearchField value="" onCommit={onCommit} placeholder="タイトルで検索" />
    );

    const input = screen.getByPlaceholderText("タイトルで検索");

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "かな" } });
    fireEvent.blur(input, { currentTarget: { value: "かな" } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onCommit).not.toHaveBeenCalled();
  });
});
