"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ─── Defaults ────────────────────────────────────────────────────────────────

// Sistema bien condicionado (mercado estable)
const DEFAULT_STABLE = {
  label: "Sistema estable (mercado normal)",
  zona_names: ["Mercado Central", "Zona Sur", "Zona Norte", "El Alto"],
  producto_names: ["Alimentos", "Carburante", "Medicamentos", "Agua"],
  matrix_a: [
    [4, 1, 0, 0],
    [1, 3, 1, 0],
    [0, 1, 4, 1],
    [0, 0, 1, 3],
  ],
  vector_b: [1200, 900, 1100, 800],
};

// Sistema mal condicionado (red de distribución frágil)
const DEFAULT_ILL = {
  label: "Sistema mal condicionado (red frágil)",
  zona_names: ["Mercado Central", "Zona Sur", "Zona Norte", "El Alto"],
  producto_names: ["Alimentos", "Carburante", "Medicamentos", "Agua"],
  matrix_a: [
    [1.00, 0.99, 0.00, 0.00],
    [0.99, 0.98, 0.01, 0.00],
    [0.00, 0.01, 1.00, 0.99],
    [0.00, 0.00, 0.99, 0.98],
  ],
  vector_b: [1200, 900, 1100, 800],
};

const RUMOR_LEVELS = [
  { key: "rumor_bajo",  label: "Rumor bajo",       pct: "5%",  color: "#22c55e", icon: "💬" },
  { key: "rumor_medio", label: "Rumor medio",       pct: "15%", color: "#f59e0b", icon: "📣" },
  { key: "rumor_alto",  label: "Rumor alto",        pct: "30%", color: "#f97316", icon: "🔊" },
  { key: "panico",      label: "Pánico de compra",  pct: "60%", color: "#ef4444", icon: "🚨" },
];

const COND_COLORS: Record<string, string> = {
  green: "text-green-400", yellow: "text-yellow-400",
  orange: "text-orange-400", red: "text-red-400",
};
const COND_BG: Record<string, string> = {
  green: "bg-green-950/40 border-green-700",
  yellow: "bg-yellow-950/40 border-yellow-700",
  orange: "bg-orange-950/40 border-orange-700",
  red: "bg-red-950/40 border-red-700",
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function EscenarioF() {
  const [selectedPreset, setSelectedPreset] = useState<"stable" | "ill" | "custom">("stable");

const [n, setN] = useState(4);
const [zonaNames, setZonaNames] = useState<string[]>(DEFAULT_STABLE.zona_names);
const [productoNames, setProductoNames] = useState<string[]>(DEFAULT_STABLE.producto_names);
const [matrixA, setMatrixA] = useState<string[][]>(
  DEFAULT_STABLE.matrix_a.map((r) => r.map(String))
);
const [vectorB, setVectorB] = useState<string[]>(DEFAULT_STABLE.vector_b.map(String));
  const [rumorLevels, setRumorLevels] = useState({
    rumor_bajo: "0.05", rumor_medio: "0.15", rumor_alto: "0.30", panico: "0.60",
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRumor, setActiveRumor] = useState("rumor_bajo");

  // ── Helpers de estado ────────────────────────────────────────────────────

  function loadPreset(preset: typeof DEFAULT_STABLE, type: "stable" | "ill") {
  const sz = preset.zona_names.length;
  setSelectedPreset(type);
  setN(sz);
  setZonaNames(preset.zona_names);
  setProductoNames(preset.producto_names);
  setMatrixA(preset.matrix_a.map((r) => r.map(String)));
  setVectorB(preset.vector_b.map(String));
  setResult(null);
}

  function handleSizeChange(newN: number) {
  setSelectedPreset("custom");
  setN(newN);
  setZonaNames(Array.from({ length: newN }, (_, i) => zonaNames[i] ?? `Zona ${i + 1}`));
  setProductoNames(Array.from({ length: newN }, (_, i) => productoNames[i] ?? `Producto ${i + 1}`));
  setMatrixA(
    Array.from({ length: newN }, (_, i) =>
      Array.from({ length: newN }, (_, j) =>
        matrixA[i]?.[j] ?? (i === j ? "1" : "0")
      )
    )
  );
  setVectorB(Array.from({ length: newN }, (_, i) => vectorB[i] ?? "100"));
  setResult(null);
}

  function updateCell(i: number, j: number, val: string) {
  setSelectedPreset("custom");
  setMatrixA((m) => m.map((row, ri) => row.map((c, ci) => ri === i && ci === j ? val : c)));
}

  // ── Calcular ─────────────────────────────────────────────────────────────

  async function handleSolve() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        matrix_a: matrixA.map((r) => r.map(Number)),
        vector_b: vectorB.map(Number),
        zona_names: zonaNames,
        producto_names: productoNames,
        rumor_bajo:  parseFloat(rumorLevels.rumor_bajo),
        rumor_medio: parseFloat(rumorLevels.rumor_medio),
        rumor_alto:  parseFloat(rumorLevels.rumor_alto),
        panico:      parseFloat(rumorLevels.panico),
      };
      const res = await api.post("/api/scenario-f/solve", payload);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
        setActiveRumor("rumor_bajo");
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  // ── Conclusión ───────────────────────────────────────────────────────────

  function getConclusion() {
    if (!result) return null;
    const cond = result.numero_condicion;
    const ci   = result.cond_info;
    const zvul = result.zona_mas_vulnerable;
    const panico = result.perturbaciones?.panico;

    return (
      <div className="space-y-4 text-sm text-gray-300 leading-relaxed">

        {/* Número de condición */}
        <div className={`rounded-xl px-4 py-3 border ${COND_BG[ci.color]}`}>
          <p className={`font-semibold mb-1 ${COND_COLORS[ci.color]}`}>
            🔢 Número de condición κ(A) = {cond.toLocaleString()}
          </p>
          <p className="text-xs">{ci.desc}</p>
          <p className="text-xs text-gray-500 mt-1">
            <strong className="text-gray-300">¿Qué significa?</strong>{" "}
            El número de condición mide cuánto se amplifica el error. Si κ = {Math.round(cond)},
            un error del 1% en la demanda puede generar hasta un{" "}
            <strong className="text-white">{Math.round(cond)}% de error</strong> en la distribución calculada.
          </p>
        </div>

        {/* Impacto del pánico */}
        {panico && (
          <p>
            🚨 En el escenario de <strong className="text-red-400">pánico de compra</strong> (demanda +{panico.nivel_pct}%),
            la distribución calculada cambia un{" "}
            <strong className="text-red-400">{panico.error_rel_x}%</strong> respecto a la base.
            Esto significa que el sistema{" "}
            {panico.error_rel_x > 50
              ? "colapsa completamente — la distribución real sería radicalmente diferente a la planificada."
              : panico.error_rel_x > 20
              ? "se desestabiliza gravemente — la planificación original ya no es válida."
              : "absorbe el pánico con cambios manejables."}
          </p>
        )}

        {/* Zona vulnerable */}
        <p>
          📍 <strong className="text-white">Zona más vulnerable:</strong>{" "}
          <strong className="text-yellow-400">{zvul.zona}</strong>.
          En el peor escenario de rumor, su distribución asignada cambia hasta un{" "}
          <strong className="text-red-400">{zvul.pct_cambio_max}%</strong> respecto al plan base.
          Esto la convierte en el punto más frágil de la red de distribución.
        </p>

        {/* Interpretación matemática */}
        <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
          <strong className="text-gray-200">📐 Interpretación matemática:</strong>
          <br />
          El sistema Ax = b representa la distribución: A es la red logística, b es la demanda, x es la asignación óptima.
          Cuando el rumor perturba b en Δb, la solución cambia en Δx = A⁻¹·Δb.
          La amplificación del error está acotada por: ‖Δx‖/‖x‖ ≤ κ(A) · ‖Δb‖/‖b‖.
          <br /><br />
          Un sistema <strong className="text-gray-200">bien condicionado</strong> (κ pequeño) es robusto a rumores.
          Un sistema <strong className="text-gray-200">mal condicionado</strong> (κ grande) colapsa ante cualquier perturbación social.
        </div>

        <p className="text-xs text-gray-500">
          💡 <strong className="text-gray-300">Conclusión práctica:</strong>{" "}
          En una crisis de bloqueos, las redes de distribución con alta interdependencia entre zonas
          (filas similares en A) son extremadamente vulnerables a los rumores. Una pequeña noticia falsa
          puede generar una demanda artificial que el sistema no puede satisfacer, provocando
          desabastecimiento real aunque los recursos sean suficientes.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold bg-orange-700 text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Escenario F · Sistemas Mal Condicionados
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Rumores y Pánico en la Red de Distribución
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Un rumor de desabastecimiento puede ser más destructivo que el desabastecimiento real.
          Este escenario modela cómo pequeños cambios en la percepción social (rumores) se amplifican
          en la red de distribución usando{" "}
          <strong className="text-white">sistemas de ecuaciones lineales mal condicionados</strong>.
        </p>
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 max-w-2xl">
          <p className="text-xs text-gray-400">
            <strong className="text-white">¿Qué es un sistema mal condicionado?</strong>{" "}
            Es un sistema donde un pequeño error en los datos de entrada (la demanda) produce un
            error enorme en la solución (la distribución). El{" "}
            <strong className="text-white">número de condición κ(A)</strong> mide exactamente eso:
            si κ = 1000, un error del 1% en la demanda puede generar hasta un 1000% de error en la distribución calculada.
          </p>
        </div>
      </div>

      {/* Sección 1: Preset */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">1. Tipo de red de distribución</h2>
        <p className="text-xs text-gray-500 mb-4">
          Elige un escenario predefinido o configura tu propia red. La diferencia clave está en la
          matriz A: una red frágil tiene filas muy similares entre sí, lo que la hace inestable.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <button
    onClick={() => loadPreset(DEFAULT_STABLE, "stable")}
    className={`text-left p-4 rounded-xl border-2 transition ${
      selectedPreset === "stable"
        ? "border-green-400 bg-green-950/50 ring-2 ring-green-500/30"
        : "border-green-700 bg-green-950/30 hover:bg-green-950/50"
    }`}
  >
    <p className="text-sm font-semibold text-green-400 mb-1">
      ✅ Red estable {selectedPreset === "stable" && "• seleccionada"}
    </p>
    <p className="text-xs text-gray-400">
      Cada zona recibe principalmente de su proveedor local. El sistema es robusto —
      los rumores tienen poco impacto en la distribución real.
    </p>
  </button>

  <button
    onClick={() => loadPreset(DEFAULT_ILL, "ill")}
    className={`text-left p-4 rounded-xl border-2 transition ${
      selectedPreset === "ill"
        ? "border-red-400 bg-red-950/50 ring-2 ring-red-500/30"
        : "border-red-700 bg-red-950/30 hover:bg-red-950/50"
    }`}
  >
    <p className="text-sm font-semibold text-red-400 mb-1">
      ⚠️ Red frágil (mal condicionada) {selectedPreset === "ill" && "• seleccionada"}
    </p>
    <p className="text-xs text-gray-400">
      Las zonas dependen de los mismos proveedores en proporciones casi iguales.
      Un pequeño rumor puede colapsar toda la distribución.
    </p>
  </button>
</div>
      </div>

      {/* Sección 2: Tamaño y nombres */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">2. Zonas y productos</h2>
        <p className="text-xs text-gray-500 mb-4">
          Define cuántas zonas de distribución tiene la red y cómo se llaman.
          El sistema modela <strong className="text-gray-300">n zonas</strong> con{" "}
          <strong className="text-gray-300">n productos</strong>.
        </p>
        <div className="flex items-center gap-4 mb-5">
          <label className="text-xs text-gray-400">Número de zonas / productos:</label>
          {[2, 3, 4, 5].map((sz) => (
            <button key={sz} onClick={() => handleSizeChange(sz)}
              className={`w-10 h-10 rounded-xl text-sm font-bold border transition ${
                n === sz ? "bg-orange-700 border-orange-500 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}>
              {sz}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">
              📍 Nombres de zonas (filas de A / elementos de b)
            </p>
            <div className="space-y-2">
              {Array.from({ length: n }).map((_, i) => (
                <input key={i}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-orange-500 focus:outline-none"
                  value={zonaNames[i] ?? ""}
                  onChange={(e) => setZonaNames((z) => z.map((v, j) => j === i ? e.target.value : v))}
                  placeholder={`Zona ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">
              📦 Nombres de productos (columnas de A)
            </p>
            <div className="space-y-2">
              {Array.from({ length: n }).map((_, i) => (
                <input key={i}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-orange-500 focus:outline-none"
                  value={productoNames[i] ?? ""}
                  onChange={(e) => setProductoNames((p) => p.map((v, j) => j === i ? e.target.value : v))}
                  placeholder={`Producto ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Matriz A y vector b */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">3. Red de distribución (Matriz A) y demanda base (Vector b)</h2>
        <p className="text-xs text-gray-500 mb-2">
          <strong className="text-gray-300">Matriz A[i][j]</strong>: fracción del producto j que se asigna a la zona i.
          Valores similares entre filas = red frágil = más vulnerable a rumores.
          <br />
          <strong className="text-gray-300">Vector b[i]</strong>: demanda base de la zona i en unidades o Bs.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs text-gray-500 w-32">Zona \ Producto</th>
                {Array.from({ length: n }).map((_, j) => (
                  <th key={j} className="px-2 py-2 text-center text-xs text-gray-400">
                    {productoNames[j] || `P${j + 1}`}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs text-orange-400">
                  Demanda base (b)
                  <span className="block font-normal text-gray-600">unidades/día</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }).map((_, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="px-2 py-2 text-xs text-gray-400 font-medium">
                    {zonaNames[i] || `Zona ${i + 1}`}
                  </td>
                  {Array.from({ length: n }).map((_, j) => (
                    <td key={j} className="px-2 py-2">
                      <input
                        type="number" step="any"
                        className={`w-20 bg-gray-800 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-orange-500 ${
                          i === j ? "border-orange-800" : "border-gray-700"
                        }`}
                        value={matrixA[i]?.[j] ?? "0"}
                        onChange={(e) => updateCell(i, j, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number" step="any"
                        className="w-24 bg-gray-800 border border-orange-800 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-orange-500"
                        value={vectorB[i] ?? "0"}
                        onChange={(e) => setVectorB((v) => v.map((val, j) => j === i ? e.target.value : val))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600">
          💡 Las celdas con borde naranja son la diagonal principal (A[i][i]) — representan la
          asignación directa de cada producto a su zona principal.
        </p>
      </div>

      {/* Sección 4: Niveles de rumor */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">4. Niveles de perturbación por rumor</h2>
        <p className="text-xs text-gray-500 mb-5">
          Cada nivel representa cuánto aumenta la demanda percibida por la población debido al rumor.
          Un rumor del 5% significa que la gente compra un 5% más de lo normal por miedo al desabastecimiento.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {RUMOR_LEVELS.map((r) => (
            <div key={r.key} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
              <p className="text-sm mb-2">{r.icon} <span className="font-semibold" style={{ color: r.color }}>{r.label}</span></p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={2} step={0.01}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm w-20 focus:border-orange-500 focus:outline-none"
                  value={rumorLevels[r.key as keyof typeof rumorLevels]}
                  onChange={(e) => setRumorLevels((prev) => ({ ...prev, [r.key]: e.target.value }))}
                />
                <span className="text-xs text-gray-500">
                  = {Math.round(parseFloat(rumorLevels[r.key as keyof typeof rumorLevels] || "0") * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button onClick={handleSolve} disabled={loading}
        className="w-full bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition mb-8">
        {loading ? "Analizando impacto de rumores..." : "▶ Simular propagación de rumores"}
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {result && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className={`rounded-2xl p-4 text-center border ${COND_BG[result.cond_info.color]}`}>
              <p className="text-xs text-gray-500 mb-1">Número de condición κ(A)</p>
              <p className={`text-2xl font-bold ${COND_COLORS[result.cond_info.color]}`}>
                {result.numero_condicion > 10000
                  ? result.numero_condicion.toExponential(2)
                  : result.numero_condicion.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${COND_COLORS[result.cond_info.color]}`}>
                {result.cond_info.nivel}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Zona más vulnerable</p>
              <p className="text-lg font-bold text-yellow-400">{result.zona_mas_vulnerable.zona}</p>
              <p className="text-xs text-gray-600 mt-1">
                Cambio máx: {result.zona_mas_vulnerable.pct_cambio_max}%
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Amplificación en pánico</p>
              <p className="text-2xl font-bold text-red-400">
                ×{result.perturbaciones?.panico?.amplificacion?.toFixed(1) ?? "—"}
              </p>
              <p className="text-xs text-gray-600 mt-1">error en x / error en b</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Error en distribución (pánico)</p>
              <p className="text-2xl font-bold text-red-400">
                {result.perturbaciones?.panico?.error_rel_x ?? "—"}%
              </p>
              <p className="text-xs text-gray-600 mt-1">vs. plan base</p>
            </div>
          </div>

          {/* Distribución base */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Distribución base (sin rumores)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Solución del sistema Ax = b sin perturbaciones. Representa la asignación óptima de
              recursos cuando la demanda es la real y no hay pánico de compra.
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-2 text-left text-gray-400">Zona</th>
                    <th className="px-4 py-2 text-center text-gray-400">Demanda base (b)</th>
                    <th className="px-4 py-2 text-center text-gray-400">Asignación óptima (x)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.zona_names.map((zona: string, i: number) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-4 py-2 font-medium text-white">{zona}</td>
                      <td className="px-4 py-2 text-center text-gray-300">{result.b_base[i]}</td>
                      <td className="px-4 py-2 text-center text-green-400 font-semibold">{result.x_base[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabs de rumor */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {RUMOR_LEVELS.map((r) => (
              <button key={r.key} onClick={() => setActiveRumor(r.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border`}
                style={{
                  backgroundColor: activeRumor === r.key ? r.color + "33" : undefined,
                  borderColor: activeRumor === r.key ? r.color : "#374151",
                  color: activeRumor === r.key ? "white" : "#9ca3af",
                }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          {/* Detalle del nivel de rumor activo */}
          {(() => {
            const rInfo = RUMOR_LEVELS.find((r) => r.key === activeRumor)!;
            const pert  = result.perturbaciones?.[activeRumor];
            if (!pert) return null;

            const barData = result.zona_names.map((zona: string, i: number) => ({
              zona,
              "Distribución base": result.x_base[i],
              "Con rumor": pert.x_perturbado[i] ? parseFloat(pert.x_perturbado[i].toFixed(2)) : 0,
            }));

            return (
              <div>
                {/* KPIs del rumor */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Aumento de demanda</p>
                    <p className="text-2xl font-bold" style={{ color: rInfo.color }}>+{pert.nivel_pct}%</p>
                    <p className="text-xs text-gray-600 mt-1">por el rumor</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Error en demanda (Δb/b)</p>
                    <p className="text-2xl font-bold text-yellow-400">{pert.error_rel_b}%</p>
                    <p className="text-xs text-gray-600 mt-1">perturbación real</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Error en distribución (Δx/x)</p>
                    <p className="text-2xl font-bold text-red-400">{pert.error_rel_x}%</p>
                    <p className="text-xs text-gray-600 mt-1">impacto en asignación</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Factor de amplificación</p>
                    <p className="text-2xl font-bold text-orange-400">×{pert.amplificacion}</p>
                    <p className="text-xs text-gray-600 mt-1">el error se multiplica</p>
                  </div>
                </div>

                {/* Gráfico comparativo */}
                <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-1">
                    Distribución base vs. con {rInfo.label}
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Comparación de la asignación de recursos por zona. La diferencia entre las barras
                    muestra cuánto cambia la distribución planificada cuando el rumor altera la demanda.
                    En un sistema mal condicionado, esta diferencia puede ser enorme aunque el rumor sea pequeño.
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="zona" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(val: any) => [parseFloat(val).toFixed(2)]}
                      />
                      <Legend />
                      <Bar dataKey="Distribución base" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Con rumor" fill={rInfo.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla detallada */}
                <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-1">Detalle por zona — {rInfo.label}</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Δx = diferencia entre la distribución con rumor y la base. Un Δx grande indica
                    que esa zona es muy sensible al rumor y puede quedar desabastecida o sobreabastecida.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-sm w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-4 py-2 text-left text-gray-400">Zona</th>
                          <th className="px-4 py-2 text-center text-gray-400">Demanda base</th>
                          <th className="px-4 py-2 text-center text-gray-400">Demanda con rumor</th>
                          <th className="px-4 py-2 text-center text-gray-400">x base</th>
                          <th className="px-4 py-2 text-center text-gray-400">x con rumor</th>
                          <th className="px-4 py-2 text-center text-gray-400">Δx</th>
                          <th className="px-4 py-2 text-center text-gray-400">Cambio %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.zona_names.map((zona: string, i: number) => {
                          const xBase = result.x_base[i];
                          const xPert = pert.x_perturbado[i];
                          const dx    = pert.delta_x[i];
                          const pct   = xBase !== 0 ? ((Math.abs(dx) / Math.abs(xBase)) * 100).toFixed(1) : "—";
                          const isVul = zona === result.zona_mas_vulnerable.zona;
                          return (
                            <tr key={i} className={`border-t border-gray-800 ${isVul ? "bg-yellow-950/20" : "hover:bg-gray-800/30"}`}>
                              <td className="px-4 py-2 font-medium text-white">
                                {zona} {isVul && <span className="text-yellow-400 text-xs ml-1">⚠️ más vulnerable</span>}
                              </td>
                              <td className="px-4 py-2 text-center text-gray-400">{result.b_base[i]}</td>
                              <td className="px-4 py-2 text-center text-orange-400">
                                {pert.b_perturbado[i]?.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-center text-green-400">{xBase}</td>
                              <td className="px-4 py-2 text-center text-orange-400">{xPert?.toFixed(4)}</td>
                              <td className="px-4 py-2 text-center font-mono text-xs">
                                <span className={dx > 0 ? "text-red-400" : "text-blue-400"}>
                                  {dx > 0 ? "+" : ""}{dx?.toFixed(4)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`font-bold text-xs ${parseFloat(pct) > 20 ? "text-red-400" : parseFloat(pct) > 5 ? "text-yellow-400" : "text-green-400"}`}>
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabla de sensibilidad global */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Tabla de sensibilidad — todos los niveles</h2>
            <p className="text-xs text-gray-500 mb-4">
              Resumen del impacto de cada nivel de rumor. La columna{" "}
              <strong className="text-gray-300">Amplificación</strong> muestra cuántas veces se
              multiplica el error: si es 50, un rumor del 1% genera un error del 50% en la distribución.
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-2 text-left text-gray-400">Nivel de rumor</th>
                    <th className="px-4 py-2 text-center text-gray-400">Aumento demanda</th>
                    <th className="px-4 py-2 text-center text-gray-400">Error en b (%)</th>
                    <th className="px-4 py-2 text-center text-gray-400">Error en x (%)</th>
                    <th className="px-4 py-2 text-center text-gray-400">Amplificación</th>
                    <th className="px-4 py-2 text-center text-gray-400">Estabilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tabla_sensibilidad.map((row: any, i: number) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-4 py-2 font-medium" style={{ color: row.color }}>{row.nivel}</td>
                      <td className="px-4 py-2 text-center text-gray-300">+{row.perturbacion_b_pct}%</td>
                      <td className="px-4 py-2 text-center text-yellow-400">{row.error_rel_b_pct}%</td>
                      <td className="px-4 py-2 text-center text-red-400 font-semibold">{row.error_rel_x_pct}%</td>
                      <td className="px-4 py-2 text-center font-bold" style={{ color: row.color }}>×{row.amplificacion}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          row.error_rel_x_pct > 50 ? "bg-red-900/50 text-red-300" :
                          row.error_rel_x_pct > 20 ? "bg-orange-900/50 text-orange-300" :
                          row.error_rel_x_pct > 5  ? "bg-yellow-900/50 text-yellow-300" :
                          "bg-green-900/50 text-green-300"
                        }`}>
                          {row.error_rel_x_pct > 50 ? "Colapso" :
                           row.error_rel_x_pct > 20 ? "Crítico" :
                           row.error_rel_x_pct > 5  ? "Inestable" : "Estable"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vulnerabilidad por zona */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Vulnerabilidad por zona</h2>
            <p className="text-xs text-gray-500 mb-4">
              Cambio máximo en la distribución de cada zona considerando el peor escenario de rumor.
              Las zonas con mayor porcentaje son las más frágiles ante la desinformación.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[...result.vulnerabilidad_zonas].sort((a: any, b: any) => b.pct_cambio_max - a.pct_cambio_max)}
                layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }}
                  label={{ value: "Cambio máximo (%)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                <YAxis type="category" dataKey="zona" stroke="#9ca3af" tick={{ fontSize: 10 }} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, "Cambio máximo"]}
                />
                <Bar dataKey="pct_cambio_max" fill="#f97316" radius={[0, 4, 4, 0]}
                  label={{ position: "right", fill: "#f97316", fontSize: 10, formatter: (v: any) => `${v}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conclusión */}
          <div className="bg-orange-950/30 border border-orange-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-orange-300">📊 Análisis del sistema</h2>
            {getConclusion()}
          </div>
        </>
      )}
    </main>
  );
}