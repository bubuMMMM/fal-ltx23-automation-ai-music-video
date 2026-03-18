// AI Music Video Generator - Root Layout
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI Music Video Generator",
  description:
    "100% automated claymation-style music videos powered by fal.ai. Upload your MP3, configure your character, and let AI create stunning visual experiences.",
  openGraph: {
    title: "AI Music Video Generator",
    description:
      "100% automated claymation-style music videos powered by fal.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Music Video Generator",
    description:
      "100% automated claymation-style music videos powered by fal.ai",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
