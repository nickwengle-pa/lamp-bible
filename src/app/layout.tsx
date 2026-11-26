import type { Metadata, Viewport } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Lamp",
  title: "Lamp — Bible Word Study & Sermon Notes",
  description:
    "Your word is a lamp to my feet (Psalm 119:105). Read Scripture with Hebrew & Greek interlinear word studies, record sermons, summarize YouTube teachings, and scan printed Bible pages.",
  manifest: "/manifest.json?v=3",
  appleWebApp: {
    capable: true,
    title: "Lamp",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32.png?v=3",
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
