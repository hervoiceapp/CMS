"use client";

import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Toaster />
      {children}
    </ThemeProvider>
  );
}
