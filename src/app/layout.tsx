import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/ToastProvider";
import { VariantTotalsProvider } from "@/components/VariantTotalsProvider";

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
      <body className="min-h-full bg-background text-foreground">
        <ToastProvider>
          <VariantTotalsProvider>
            <div className="flex min-h-full flex-col sm:flex-row">
              <Nav />
              <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8 lg:px-10">
                <div className="mx-auto w-full max-w-[1600px]">{children}</div>
              </main>
            </div>
          </VariantTotalsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
