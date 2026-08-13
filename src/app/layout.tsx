import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WishListCC",
  description: "A personal wishlist tracker with price conversion and savings goals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          <Nav />
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 pb-24 sm:pb-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
