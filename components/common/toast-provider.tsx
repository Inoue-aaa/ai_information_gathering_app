"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastTone = "success" | "error";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 1800;

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: (message, tone = "success") => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }

        setToast({
          id: Date.now(),
          message,
          tone,
        });
        setIsVisible(true);

        timeoutRef.current = window.setTimeout(() => {
          setIsVisible(false);
        }, TOAST_DURATION_MS);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} isVisible={isVisible} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}

function ToastViewport({
  toast,
  isVisible,
}: {
  toast: ToastState | null;
  isVisible: boolean;
}) {
  if (!toast) {
    return null;
  }

  const toneClass =
    toast.tone === "error"
      ? "border-red-200/80 bg-red-50/92 text-red-900"
      : "border-white/60 bg-white/88 text-ink";

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-5 sm:justify-end">
      <div
        key={toast.id}
        className={`max-w-sm rounded-full border px-4 py-2.5 text-sm shadow-lg backdrop-blur transition-all duration-200 ${
          toneClass
        } ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
    </div>
  );
}
