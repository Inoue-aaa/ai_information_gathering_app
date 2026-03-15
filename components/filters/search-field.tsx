"use client";

import { useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 250;

export function SearchField({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isComposing, setIsComposing] = useState(false);
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    if (!isComposing) {
      setInputValue(value);
    }
  }, [isComposing, value]);

  useEffect(() => {
    if (isComposing || skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (inputValue === value) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onCommit(inputValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [inputValue, isComposing, onCommit, value]);

  function commitImmediately(nextValue: string) {
    if (nextValue === value) {
      return;
    }

    skipDebounceRef.current = true;
    onCommit(nextValue);
  }

  return (
    <input
      value={inputValue}
      onChange={(event) => {
        setInputValue(event.target.value);
      }}
      onCompositionStart={() => {
        setIsComposing(true);
      }}
      onCompositionEnd={(event) => {
        const nextValue = event.currentTarget.value;
        setIsComposing(false);
        setInputValue(nextValue);
        commitImmediately(nextValue);
      }}
      onBlur={(event) => {
        if (!isComposing) {
          commitImmediately(event.currentTarget.value);
        }
      }}
      placeholder={placeholder}
      enterKeyHint="search"
      className="h-11 min-w-0 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
    />
  );
}
