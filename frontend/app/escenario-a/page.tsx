"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const METHODS = [
  { value: "jacobi", label: "Jacobi" },
  { value: "gauss_seidel", label: "Gauss-Seidel" },
  { value: "sor", label: "SOR" },
  { value: "lu", label: "Descomposición LU" },
  { value: "conjugate_gradient", label: "Gradiente Conjugado" },
];

const DEFAULT_A = [
  [10, -1, 2],
  [-1, 11, -1],
  [2, -1, 10],
];
const DEFAULT_B = [6, 25, -11];
const DEFAULT_ZONES = ["El Alto", "Zona Centro de La Paz", "Zona Sur"];
const DEFAULT_SOURCES = ["Planta Senkata", "Planta Palmasola", "Planta Sur"];

export default function EscenarioA() {
  const [size, setSize] = useState(3);
  const [A, setA] = useState<number[][]>(DEFAULT_A);
  const [b, setB] = useState<number[]>(DEFAULT_B);
  const [zoneNames, setZoneNames] = useState<string[]>(DEFAULT_ZONES);
  const [sourceNames, setSourceNames] = useState<string[]>(DEFAULT_SOURCES);
  const [method, setMethod] = useState("jacobi");
  const [omega, setOmega] = useState(1.25);
  const [tol, setTol] = useState(1e-6);
  const [maxIter, setMaxIter] = useState(100);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleAChange(i: number, j: number, val: string) {
    const newA = A.map((row) => [...row]);
    newA[i][j] = parseFloat(val) || 0;
    setA(newA);
  }

  function handleBChange(i: number, val: string) {
    const newB = [...b];
    newB[i] = parseFloat(val) || 0;
    setB(newB);
  }

  function handleSizeChange(newSize: number) {
    setSize(newSize);
    setA(Array.from({ length: newSize }, (_, i) =>
      Array.from({ length: newSize }, (_, j) => (i === j ? 10 : 0))
    ));
    setB(Array(newSize).fill(0));
    setZoneNames(Array.from({ length: newSize }, (_, i) => `Zona ${i + 1}`));
    setSourceNames(Array.from({ length: newSize }, (_, i) => `Planta ${i + 1}`));
    setResult(null);
  }

  async function handleSolve() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/api/scenario-a/solve", {
        A,
        b,
        method,
        tol,
        max_iter: maxIter,
        omega,
        zone_names: zoneNames,
        source_names: sourceNames,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function getConclusion() {
    if (!result) return null;
    const sol = result.solution_labeled;
    const max = sol.reduce((a: any, b: any) => (a.value > b.value ? a : b));
    const min = sol.reduce((a: any, b: any) => (a.value < b.value ? a : b));
    const methodLabel = METHODS.find((m) => m.value === method)?.label;
    const hasNegative = sol.some((s: any) => s.value < 0);

    return (
      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        <p>
          {result.converged
            ? <span>✅ El método <strong className="text-white">{methodLabel}</strong> encontró una solución en <strong className="text-white">{result.total_iterations} pasos</strong>. Esto significa que el sistema de distribución tiene una respuesta matemáticamente estable.</span>
            : <span>⚠️ El método <strong className="text-white">{methodLabel}</strong> no logró encontrar una solución exacta en {result.total_iterations} pasos. Esto puede indicar que las condiciones del sistema son demasiado inestables (como ocurre durante un bloqueo severo). Prueba con otro método o revisa los datos ingresados.</span>
          }
        </p>
        <p>
          🚛 La zona que más cisternas de combustible necesita es <strong className="text-white">{max.label}</strong> con <strong className="text-white">{max.value.toFixed(2)} cisternas/día</strong>. Si una ruta hacia esta zona se bloquea, el impacto social sería el más grave.
        </p>
        <p>
          📉 La zona con menor asignación es <strong className="text-white">{min.label}</strong> con <strong className="text-white">{min.value.toFixed(2)} cisternas/día</strong>.
          {min.value < 0
            ? <span className="text-red-400"> ⚠️ El valor negativo indica que esta zona no puede ser abastecida con las condiciones actuales. En la práctica, esto significa desabastecimiento real: filas, escasez y conflicto social.</span>
            : <span> Esta zona está siendo cubierta, aunque con menor prioridad.</span>
          }
        </p>
        {hasNegative && (
          <p className="bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 text-red-300">
            🔴 <strong>Alerta de desequilibrio:</strong> Uno o más valores negativos indican que el sistema no puede satisfacer todas las demandas simultáneamente. Esto refleja matemáticamente lo que ocurre durante los bloqueos: la oferta es insuficiente para cubrir la necesidad real de la población.
          </p>
        )}
        <p className="text-gray-400">
          💡 <strong className="text-gray-300">Recomendación:</strong> Prueba cambiar el método numérico y observa si los resultados varían. Métodos como Gauss-Seidel y RK4 suelen converger más rápido. Si aumentas la demanda en el Vector b y el sistema deja de converger, eso simula el colapso logístico por bloqueo.
        </p>
      </div>
    );
  }

  const chartData = result?.iterations?.slice(0, 50).map((it: any) => ({
    iteracion: it.iteration,
    error: parseFloat(it.error.toFixed(8)),
  }));

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Escenario A · Sistemas de Ecuaciones Lineales
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Optimización del Abastecimiento y Red de Transporte
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Durante los bloqueos en Bolivia, distribuir combustible, alimentos y medicamentos se convierte en un
          problema crítico. Este simulador modela cómo distribuir recursos desde plantas de origen hacia zonas
          de la ciudad, resolviendo el sistema de ecuaciones que representa las restricciones de oferta,
          demanda y capacidad de rutas. Puedes cambiar los datos y el método para ver cómo varía la solución.
        </p>
      </div>

      {/* Configuración */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">1. Configuración del sistema</h2>
        <p className="text-xs text-gray-500 mb-5">
          Define el tamaño del problema, el método de cálculo y la precisión deseada.
        </p>
        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">Plantas y zonas</label>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={size}
              onChange={(e) => handleSizeChange(parseInt(e.target.value))}
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} plantas → {n} zonas</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1 max-w-[180px]">
              Cuántas plantas de abastecimiento y zonas de destino tiene tu red.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">Método de cálculo</label>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1 max-w-[180px]">
              La estrategia matemática que usará la computadora para encontrar la distribución óptima.
            </p>
          </div>
          {method === "sor" && (
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Factor de aceleración ω</label>
              <input
                type="number" step="0.05" min="0.1" max="1.99"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-28"
                value={omega}
                onChange={(e) => setOmega(parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1 max-w-[180px]">
                Solo para SOR. Valores entre 1 y 2 aceleran la convergencia.
              </p>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">Margen de error aceptable</label>
            <input
              type="number" step="0.000001"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
              value={tol}
              onChange={(e) => setTol(parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-600 mt-1 max-w-[180px]">
              Qué tan precisa debe ser la respuesta. Un valor más pequeño = más exacto pero más lento.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">Límite de intentos</label>
            <input
              type="number"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-28"
              value={maxIter}
              onChange={(e) => setMaxIter(parseInt(e.target.value))}
            />
            <p className="text-xs text-gray-600 mt-1 max-w-[180px]">
              Cuántas veces puede intentar el método antes de detenerse si no converge.
            </p>
          </div>
        </div>
      </div>

      {/* Nombres de zonas y plantas */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">2. Plantas de origen y zonas de destino</h2>
        <p className="text-xs text-gray-500 mb-5">
          Las <span className="text-green-400 font-medium">plantas</span> son los centros de acopio o depósitos desde donde sale el combustible o alimento.
          Las <span className="text-blue-400 font-medium">zonas</span> son los barrios, mercados o estaciones de servicio que necesitan recibir esos recursos.
          Puedes personalizar los nombres según tu ciudad.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-green-400 mb-3 uppercase tracking-wider">🏭 Plantas de abastecimiento (origen)</p>
            <div className="flex flex-col gap-3">
              {sourceNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Planta {i + 1}</span>
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1"
                    value={name}
                    onChange={(e) => {
                      const updated = [...sourceNames];
                      updated[i] = e.target.value;
                      setSourceNames(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">📍 Zonas de destino (demanda)</p>
            <div className="flex flex-col gap-3">
              {zoneNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Zona {i + 1}</span>
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1"
                    value={name}
                    onChange={(e) => {
                      const updated = [...zoneNames];
                      updated[i] = e.target.value;
                      setZoneNames(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Matriz A */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">3. Matriz A — Coeficientes del sistema</h2>
        <p className="text-xs text-gray-500 mb-4">
          Cada fila representa una ecuación. Los valores indican cómo cada zona afecta a las demás (costos, capacidades, restricciones).
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-gray-500 text-left">Ecuación</th>
                {zoneNames.map((z, j) => (
                  <th key={j} className="px-2 py-1 text-blue-400 text-center">{z}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {A.map((row, i) => (
                <tr key={i}>
                  <td className="px-2 py-1 text-gray-500 text-xs">Ec. {i + 1}</td>
                  {row.map((val, j) => (
                    <td key={j} className="px-1 py-1">
                      <input
                        type="number"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 w-20 text-center text-sm"
                        value={val}
                        onChange={(e) => handleAChange(i, j, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vector b */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">4. Vector b — Demanda por zona</h2>
        <p className="text-xs text-gray-500 mb-4">
          Representa la demanda mínima o el requerimiento de cada zona (En numero de camiones Sisternas.)Por dia.
        </p>
        <div className="flex flex-wrap gap-4">
          {b.map((val, i) => (
            <div key={i}>
              <label className="text-xs text-gray-400 block mb-1">{zoneNames[i]}</label>
              <input
                type="number"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-28 text-center"
                value={val}
                onChange={(e) => handleBChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button
        onClick={handleSolve}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition mb-8"
      >
        {loading ? "Calculando..." : "Calcular distribución óptima"}
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {result && (
        <>
          {/* Solución */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Solución — Distribución óptima</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {result.solution_labeled.map((s: any, i: number) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-blue-400">{s.value.toFixed(4)}</p>
                  <p className="text-xs text-gray-500 mt-1">unidades asignadas</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.converged ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                {result.converged ? "✓ Convergió" : "✗ No convergió"}
              </span>
              <span className="text-gray-400">
                Iteraciones: <strong className="text-white">{result.total_iterations}</strong>
              </span>
            </div>
          </div>

          {/* Gráfico de convergencia */}
          {result.iterations?.length > 1 && (
            <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-1">Convergencia del método</h2>
              <p className="text-xs text-gray-500 mb-4">
                Muestra cómo el error disminuye con cada iteración. Una caída rápida indica que el método converge eficientemente.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="iteracion" stroke="#9ca3af" tick={{ fontSize: 11 }} label={{ value: "Iteración", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} label={{ value: "Error", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="error" stroke="#3b82f6" strokeWidth={2} dot={false} name="Error por iteración" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla de iteraciones */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Tabla de iteraciones</h2>
            <p className="text-xs text-gray-500 mb-4">
              Muestra cómo evoluciona la solución en cada paso del método seleccionado.
            </p>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="text-xs w-full">
                <thead className="sticky top-0 bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400">Iteración</th>
                    {result.solution_labeled.map((s: any) => (
                      <th key={s.variable} className="px-3 py-2 text-blue-400">{s.label}</th>
                    ))}
                    <th className="px-3 py-2 text-gray-400">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.iterations.map((it: any) => (
                    <tr key={it.iteration} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-gray-400">{it.iteration}</td>
                      {it.x.map((v: number, i: number) => (
                        <td key={i} className="px-3 py-2 text-center">{v.toFixed(4)}</td>
                      ))}
                      <td className="px-3 py-2 text-center text-yellow-400">{it.error.toExponential(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusión */}
          <div className="bg-blue-950/40 border border-blue-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-blue-300">📊 Conclusión e interpretación</h2>
            <p className="text-sm text-gray-300 leading-relaxed">{getConclusion()}</p>
          </div>
        </>
      )}
    </main>
  );
}