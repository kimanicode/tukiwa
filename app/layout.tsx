import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tukiwa",
  description: "Seamless Fundraising, Made Simple",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Meta viewport tag for responsive scaling on iPhones */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>
      <body className="overflow-x-hidden">
        <Navbar/>
        {children}
        <Footer/>
      </body>
    </html>
  );
}

