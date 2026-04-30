import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata = {
  title: "What's Close",
  description: "Find what's close to you",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={figtree.variable}>
        {children}
      </body>
    </html>
  );
}
