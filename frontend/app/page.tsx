"use client";
import Link from "next/link";
import { useState } from "react";

const ESCENARIOS = [
  {
    href: "/escenario-a",
    id: "A",
    titulo: "Optimización del Abastecimiento",
    desc: "Distribución óptima desde plantas hacia zonas usando sistemas de ecuaciones lineales.",
    metodos: "Jacobi · Gauss-Seidel · SOR · LU · Gradiente Conjugado",
    icono: "🏭",
    color: "blue",
  },
  {
    href: "/escenario-b",
    id: "B",
    titulo: "Vaciado de Reservas de Combustible",
    desc: "Simulación del agotamiento de reservas de combustible ante bloqueos prolongados.",
    metodos: "Euler · Heun · Runge-Kutta 4",
    icono: "⛽",
    color: "yellow",
  },
  {
    href: "/escenario-c",
    id: "C",
    titulo: "Precios de Alimentos",
    desc: "Reconstrucción de la curva de precios de alimentos con datos escasos durante crisis.",
    metodos: "Lagrange · Newton · Splines Cúbicos",
    icono: "🥬",
    color: "green",
  },
  {
    href: "/escenario-d",
    id: "D",
    titulo: "Poder Adquisitivo Familiar",
    desc: "Cálculo del umbral de ingreso donde una familia ya no puede cubrir la canasta básica.",
    metodos: "Bisección · Newton-Raphson · Secante",
    icono: "👨‍👩‍👧",
    color: "purple",
  },
  {
    href: "/escenario-e",
    id: "E",
    titulo: "Umbrales Críticos de Abastecimiento",
    desc: "Determinación del momento exacto en que el stock de un producto llega a nivel crítico.",
    metodos: "Bisección · Newton-Raphson · Secante",
    icono: "⚠️",
    color: "teal",
  },
  {
    href: "/escenario-f",
    id: "F",
    titulo: "Rumores y Pánico en la Distribución",
    desc: "Modelado del impacto de rumores sociales en redes de distribución mal condicionadas.",
    metodos: "Sistemas Mal Condicionados · Número de Condición · Perturbación",
    icono: "📣",
    color: "orange",
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; text: string; hover: string }> = {
  blue:   { border: "border-blue-800",   bg: "bg-blue-950/20",   badge: "bg-blue-900/60 text-blue-300",   text: "text-blue-400",   hover: "hover:border-blue-600 hover:bg-blue-950/40" },
  yellow: { border: "border-yellow-800", bg: "bg-yellow-950/20", badge: "bg-yellow-900/60 text-yellow-300", text: "text-yellow-400", hover: "hover:border-yellow-600 hover:bg-yellow-950/40" },
  green:  { border: "border-green-800",  bg: "bg-green-950/20",  badge: "bg-green-900/60 text-green-300",  text: "text-green-400",  hover: "hover:border-green-600 hover:bg-green-950/40" },
  purple: { border: "border-purple-800", bg: "bg-purple-950/20", badge: "bg-purple-900/60 text-purple-300", text: "text-purple-400", hover: "hover:border-purple-600 hover:bg-purple-950/40" },
  teal:   { border: "border-teal-800",   bg: "bg-teal-950/20",   badge: "bg-teal-900/60 text-teal-300",   text: "text-teal-400",   hover: "hover:border-teal-600 hover:bg-teal-950/40" },
  orange: { border: "border-orange-800", bg: "bg-orange-950/20", badge: "bg-orange-900/60 text-orange-300", text: "text-orange-400", hover: "hover:border-orange-600 hover:bg-orange-950/40" },
};

export default function Home() {
  const [nombre, setNombre] = useState("");

  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-16 pb-12 max-w-5xl mx-auto">

        {/* Badge */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold bg-gray-800 text-gray-300 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-700">
            Proyecto Final · Métodos Numéricos
          </span>
          <span className="text-xs text-gray-600">Primero - 2026</span>
        </div>

        {/* Título */}
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
          Crisis de Abastecimiento{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
            en Bolivia
          </span>
        </h1>
        <p className="text-gray-400 text-base max-w-2xl mb-8 leading-relaxed">
          Simulación computacional de escenarios reales usando métodos numéricos.
          Cada módulo modela un aspecto diferente del impacto de los bloqueos en
          el suministro de combustible, alimentos y medicamentos en{" "}
          <strong className="text-white">La Paz, Bolivia</strong>.
        </p>

        {/* Contexto del problema */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-8 max-w-3xl">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            🇧🇴 Contexto del problema
          </p>
          <p className="text-sm text-gray-300 leading-relaxed mb-2">
            Bolivia ha enfrentado episodios recurrentes de bloqueos de carreteras que interrumpen
            las cadenas de suministro hacia las ciudades. La Paz, siendo la sede de gobierno y una
            de las ciudades más pobladas del país, es especialmente vulnerable: al estar rodeada
            por el altiplano, depende de rutas terrestres críticas para el abastecimiento de
            combustible, alimentos y medicamentos.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Cuando estas rutas se bloquean, los efectos se propagan rápidamente: las reservas de
            combustible caen, los precios de alimentos suben, el poder adquisitivo de las familias
            se deteriora y los rumores de desabastecimiento generan pánico de compra que agrava
            la crisis. Este proyecto modela matemáticamente cada uno de estos fenómenos.
          </p>
        </div>

        {/* Campo de nombre del estudiante */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-600 rounded-2xl p-5 mb-10 max-w-md">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            👤 Estudiante: 
            <strong className="text-white">ALEJANDRO AIRTON OCHOA MAIDANA</strong>.
          </p>
          {nombre && (
            <p className="text-xs text-gray-400 mt-2">
              ✅ Proyecto presentado por:{" "}
              <strong className="text-white">{nombre}</strong>
            </p>
          )}
        </div>
      </section>

      {/* ── Escenarios ───────────────────────────────────────────────────── */}
      <section className="px-6 pb-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Escenarios de simulación</h2>
          <span className="text-xs text-gray-500">{ESCENARIOS.length} módulos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {ESCENARIOS.map((e) => {
            const c = COLOR_MAP[e.color];
            return (
              <Link
                key={e.id}
                href={e.href}
                className={`group rounded-2xl border p-5 transition-all duration-200 ${c.border} ${c.bg} ${c.hover}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{e.icono}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                    Escenario {e.id}
                  </span>
                </div>
                <h3 className={`text-sm font-semibold mb-1 ${c.text}`}>{e.titulo}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">{e.desc}</p>
                <p className="text-xs text-gray-600 font-mono">{e.metodos}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 group-hover:text-gray-300 transition">
                  Abrir simulación <span className="ml-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Botón conclusiones */}
        <Link
          href="/conclusiones"
          className="flex items-center justify-between w-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-600 hover:border-gray-400 rounded-2xl px-6 py-5 transition group"
        >
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">
              📊 Conclusiones del proyecto
            </p>
            <p className="text-xs text-gray-400">
              Análisis reflexivo de cada escenario: aprendizajes, métodos, limitaciones y mejoras.
            </p>
          </div>
          <span className="text-gray-500 group-hover:text-white transition text-xl">→</span>
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 px-6 py-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            Métodos Numéricos · Simulación de crisis de abastecimiento · La Paz, Bolivia
          </p>
          {nombre && (
            <p className="text-xs text-gray-500">
              Autor: <strong className="text-gray-400">{nombre}</strong>
            </p>
          )}
        </div>
      </footer>

    </main>
  );
}