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
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return {
    mode: (mounted ? (theme as ThemeMode) : "dark") || "dark",
    resolved: (mounted ? (resolvedTheme as "light" | "dark") : "dark") || "dark",
    setMode: (newMode: ThemeMode) => setTheme(newMode),
    mounted,
  }
}

