"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={toggleTheme}
      className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      aria-label="Toggle theme"
    >
      <HugeiconsIcon icon={theme === "dark" ? Sun01Icon : Moon01Icon} size={20} />
      <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </Button>
  );
}
