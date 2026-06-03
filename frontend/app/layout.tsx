import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Métodos Numéricos — Bolivia",
  description: "Simulación de crisis de abastecimiento en La Paz, Bolivia",
};

const NAV_LINKS = [
  { href: "/",             label: "Inicio" },
  { href: "/escenario-a", label: "A" },
  { href: "/escenario-b", label: "B" },
  { href: "/escenario-c", label: "C" },
  { href: "/escenario-d", label: "D" },
  { href: "/escenario-e", label: "E" },
  { href: "/escenario-f", label: "F" },
  { href: "/conclusiones", label: "Conclusiones" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}>

        {/* ── Navbar ── */}
        <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="text-sm font-bold text-white whitespace-nowrap">
              🇧🇴 Métodos Numéricos
            </Link>

            {/* Links */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {NAV_LINKS.slice(1, 7).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition whitespace-nowrap"
                >
                  Esc. {l.label}
                </Link>
              ))}
              <div className="w-px h-4 bg-gray-700 mx-1" />
              <Link
                href="/conclusiones"
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition whitespace-nowrap font-medium"
              >
                📊 Conclusiones
              </Link>
            </div>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}