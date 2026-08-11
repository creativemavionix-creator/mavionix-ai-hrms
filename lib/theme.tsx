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
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  try {
    const { theme, setTheme, resolvedTheme } = useNextTheme()
    return {
      mode: (mounted ? (theme as ThemeMode) : "dark") || "dark",
      resolved: (mounted ? (resolvedTheme as "light" | "dark") : "dark") || "dark",
      setMode: (newMode: ThemeMode) => setTheme ? setTheme(newMode) : undefined,
      mounted,
    }
  } catch (e) {
    return {
      mode: "dark" as ThemeMode,
      resolved: "dark" as "light" | "dark",
      setMode: (newMode: ThemeMode) => {},
      mounted: true,
    }
  }
}

