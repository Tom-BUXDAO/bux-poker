import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { getServerSession } from "next-auth";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BUX Poker Tournaments",
  description: "Join BUX poker tournaments and compete with other players!",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession();

  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers session={session}>
          <Header />
          <main className="min-h-screen pt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
