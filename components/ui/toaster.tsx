"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"

      closeButton
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "rounded-lg border border-border bg-card text-card-foreground shadow-lg",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          success:
            "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
          error:
            "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100",
        },
      }}
    />
  );
}
