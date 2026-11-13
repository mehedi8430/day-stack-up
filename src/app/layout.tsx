import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header";
import { GlobalFocusTimer } from "@/components/global-focus-timer";
import { getActiveFocusSession } from "@/app/actions/focus.actions";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "DayStackUp",
  description: "Stack your day. Keep moving up. Track habits, plan your day, and visualize your progress.",
};

const themeScript = `try{var t=localStorage.getItem("habit-theme");if(t?t==="dark":!window.matchMedia("(prefers-color-scheme: light)").matches){document.documentElement.classList.add("dark")}}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { session: initialFocusSession } = user
    ? await getActiveFocusSession()
    : { session: null };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen bg-background text-foreground">
            <AppHeader isAuthorized={!!user} userEmail={user?.email} />
            <main
              className={`container ${user ? "pb-20 lg:pb-0" : ""}`}
            >
              {children}
            </main>
            {user && (
              <GlobalFocusTimer initialFocusSession={initialFocusSession} />
            )}
          </div>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
