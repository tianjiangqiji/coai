import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme !== "system") return;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    root.classList.remove("light", "dark");
    if (theme === "system") {
      root.classList.add(mediaQuery.matches ? "dark" : "light");
      mediaQuery.addEventListener("change", handleChange);
    } else {
      root.classList.add(theme);
    }

    return () => mediaQuery.removeEventListener("change", handleChange);
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

export function ThemeToggle({
  className,
  size = "icon",
}: {
  className?: string;
  size?: "icon" | "icon-md";
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => toggleTheme?.()}
      className={`!m-0 ${className || ""}`}
    >
      <AnimatePresence mode="wait">
        {theme === "light" ? (
          <motion.div
            key="sun"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4" />
          </motion.div>
        ) : theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="monitor"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Monitor className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}

export default ThemeToggle;
