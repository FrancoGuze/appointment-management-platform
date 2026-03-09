"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      closeButton
      richColors
      toastOptions={{
        duration: 4200,
      }}
    />
  );
}
