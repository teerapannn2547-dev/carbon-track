import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carbon Track",
  description: "Carbon Tracking System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-200">

        <div
          className="
            min-h-screen
            flex
            justify-center
            items-start
            py-4
          "
        >
          <div
            className="
              w-full
              max-w-md
              min-h-screen
              bg-[#eef7f1]
              shadow-2xl
              overflow-hidden
              relative
            "
          >
            {children}
          </div>
        </div>

      </body>
    </html>
  );
}