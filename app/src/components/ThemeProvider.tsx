import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from "./ui/button";
import { getMemory, setMemory } from "@/utils/memory.ts";
import { themeEvent } from "@/events/theme.ts";

const defaultTheme: Theme = "system";

export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children?: ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme?: () => void;
};

export function activeTheme(theme: Theme) {
  const root = window.document.documentElement;

  root.classList.remove("light", "dark");
  let actualTheme = theme;
  if (theme === "system") {
    actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  root.classList.add(actualTheme);
  setMemory("theme", theme);
  themeEvent.emit(actualTheme);
}

export function getTheme() {
  return (getMemory("theme") as Theme) || defaultTheme;
}

// system -> dark -> light -> system
function getNextTheme(current: Theme): Theme {
  return current === "system" ? "dark" : current === "dark" ? "light" : "system";
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: (theme: Theme) => {
    activeTheme(theme);
  },
  toggleTheme: () => {
    const key = getMemory("theme");
    const current = (key.length > 0 ? (key as Theme) : defaultTheme) as Theme;
    const next = getNextTheme(current);
    activeTheme(next);
  },
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (getMemory("theme") as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      activeTheme(newTheme);
      setTheme(newTheme);
    },
    toggleTheme: () => {
      const nextTheme: Theme = getNextTheme(theme);
      activeTheme(nextTheme);
      setTheme(nextTheme);
    },
  };

  return <ThemeProviderContext.Provider {...props} value={value} />;
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

export function ThemeToggle({ className, size = "icon" }: { className?: string; size?: "icon" | "icon-md" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => toggleTheme?.()}
      className={`!m-0 ${className || ''}`}
    >
      <Sun
        className={`h-4 w-4 transition-all ${theme === "light" ? "relative rotate-0 scale-100" : "absolute -rotate-90 scale-0"}`}
      />
      <Moon
        className={`h-4 w-4 transition-all ${theme === "dark" ? "relative rotate-0 scale-100" : "absolute rotate-90 scale-0"}`}
      />
      <Monitor
        className={`h-4 w-4 transition-all ${theme === "system" ? "relative rotate-0 scale-100" : "absolute rotate-90 scale-0"}`}
      />
    </Button>
  );
}

export default ThemeToggle;
