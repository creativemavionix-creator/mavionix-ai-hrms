import type { Metadata } from "next"
import { Space_Mono, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { SupportWidget } from "@/components/support/SupportWidget"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "HireMind AI — Candidate Portal",
  description: "AI-powered interview portal for candidates",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${plusJakartaSans.variable} ${spaceMono.variable} antialiased font-sans`}>
        {children}
        <SupportWidget />
      </body>
    </html>
  )
}
