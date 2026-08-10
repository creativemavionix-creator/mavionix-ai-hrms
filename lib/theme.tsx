"use client"

import React, { type ReactNode } from "react"
import { useTheme as useNextTheme, ThemeProvider as NextThemesProvider } from "next-themes"

export type ThemeMode = "light" | "dark" | "system"

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()

  return {
    mode: (theme as ThemeMode) || "dark",
    resolved: (resolvedTheme as "light" | "dark") || "dark",
    setMode: (newMode: ThemeMode) => setTheme(newMode),
  }
}

