# 🇧🇴 Métodos Numéricos — Crisis de Abastecimiento en Bolivia

Proyecto final de la materia **Métodos Numéricos**.  
Simulación computacional de escenarios reales basados en la crisis de abastecimiento
en La Paz, Bolivia, causada por bloqueos de carreteras.

## 🗂️ Escenarios
Escenario	                  Tema    	                              Métodos
    A	     Optimización del abastecimiento	          Jacobi, Gauss-Seidel, SOR, LU, Gradiente Conjugado
    B	     Vaciado de reservas de combustible	          Euler, Heun, Runge-Kutta 4
    C	     Precios de alimentos	                      Lagrange, Newton, Splines Cúbicos
    D	     Poder adquisitivo familiar	                  Bisección, Newton-Raphson, Secante
    E	     Umbrales críticos de abastecimiento	      Bisección, Newton-Raphson, Secante
    F	     Rumores y pánico en la distribución	      Sistemas mal condicionados, Número de condición

Stack tecnológico
Frontend: Next.js 14 + TypeScript + Tailwind CSS
Backend: FastAPI (Python) + NumPy + SciPy

Backend ejecuta este en la terminal que sea power shell
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload


Frontend 
cd frontend
npm install
npm run dev

para hacerlo correr en local debes tener dos terminales ejecutandose al mismo tiempo.
RouteLLM
Routing to Claude Sonnet 4.6
Perfecto, vamos por partes.

1. Navbar — agrégalo en src/app/layout.tsx
Abre tu layout.tsx y reemplázalo con esto (no toca page.tsx):

tsx
Copy
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
Eso es todo para el navbar — al estar en layout.tsx aparece automáticamente en todos los escenarios y en conclusiones, pero no altera nada del page.tsx de inicio.

2. Preparar para GitHub
Crea .gitignore en la raíz del proyecto
gitignore
Copy
# Python
backend/.venv/
backend/venv/
backend/__pycache__/
backend/**/__pycache__/
backend/*.pyc
backend/.env

# Node
frontend/node_modules/
frontend/.next/
frontend/.env.local
frontend/.env

# OS
.DS_Store
Thumbs.db
Crea README.md en la raíz
markdown
Copy
# 🇧🇴 Métodos Numéricos — Crisis de Abastecimiento en Bolivia

Proyecto final de la materia **Métodos Numéricos**.  
Simulación computacional de escenarios reales basados en la crisis de abastecimiento
en La Paz, Bolivia, causada por bloqueos de carreteras.

## 🗂️ Escenarios
Escenario	Tema	Métodos
A	Optimización del abastecimiento	Jacobi, Gauss-Seidel, SOR, LU, Gradiente Conjugado
B	Vaciado de reservas de combustible	Euler, Heun, Runge-Kutta 4
C	Precios de alimentos	Lagrange, Newton, Splines Cúbicos
D	Poder adquisitivo familiar	Bisección, Newton-Raphson, Secante
E	Umbrales críticos de abastecimiento	Bisección, Newton-Raphson, Secante
F	Rumores y pánico en la distribución	Sistemas mal condicionados, Número de condición
🛠️ Stack tecnológico
Frontend: Next.js 14 + TypeScript + Tailwind CSS
Backend: FastAPI (Python) + NumPy + SciPy
🚀 Cómo correr el proyecto localmente
Backend
bash
Copy
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
Frontend
bash
Copy
cd frontend
npm install
npm run dev

Abre http://localhost:3000

ESTRUCTURA DE CARPETAS:
metodos-numericos-bolivia/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints por escenario
│   │   ├── main.py
│   │   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── escenario-a/
│   │   ├── escenario-b/
│   │   ├── escenario-c/
│   │   ├── escenario-d/
│   │   ├── escenario-e/
│   │   ├── escenario-f/
│   │   ├── conclusiones/
│   │   └── page.tsx