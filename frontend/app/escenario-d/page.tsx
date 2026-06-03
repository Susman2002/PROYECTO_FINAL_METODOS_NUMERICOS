"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── Constantes ──────────────────────────────────────────────────────────────

const METHODS = [
  {
    value: "trapecio",
    label: "Regla del Trapecio",
    color: "#f59e0b",
    desc: "Divide el área bajo la curva en trapecios. Simple y rápido. Funciona bien cuando la curva es casi lineal entre puntos.",
    formula: "∫ ≈ (h/2)[f(x₀) + 2f(x₁) + ... + 2f(xₙ₋₁) + f(xₙ)]",
  },
  {
    value: "simpson13",
    label: "Simpson 1/3",
    color: "#10b981",
    desc: "Usa parábolas para aproximar la curva. Más preciso que el trapecio cuando la curva tiene curvatura suave. Requiere número par de intervalos.",
    formula: "∫ ≈ (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + f(xₙ)]",
  },
  {
    value: "simpson38",
    label: "Simpson 3/8",
    color: "#3b82f6",
    desc: "Variante de Simpson que usa polinomios de grado 3. Muy preciso para curvas con mayor curvatura. Requiere múltiplos de 3 intervalos.",
    formula: "∫ ≈ (3h/8)[f(x₀) + 3f(x₁) + 3f(x₂) + 2f(x₃) + ... + f(xₙ)]",
  },
];

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#a78bfa", "#f43f5e", "#06b6d4"];

const PRODUCTOS_DEFAULT = [
  { nombre: "Papa", dias: [1, 5, 10, 15, 20, 30], precios: [8, 10, 13, 16, 19, 22], cantidad_diaria: 1, unidad: "kg" },
  { nombre: "Arroz", dias: [1, 5, 10, 15, 20, 30], precios: [5, 5.5, 6, 7, 8, 9], cantidad_diaria: 0.5, unidad: "kg" },
  { nombre: "Aceite", dias: [1, 10, 20, 30], precios: [15, 18, 22, 28], cantidad_diaria: 0.1, unidad: "litro" },
];

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Producto = {
  nombre: string;
  dias: string[];
  precios: string[];
  cantidad_diaria: string;
  unidad: string;
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function EscenarioD() {
  const [method, setMethod] = useState("simpson13");
  const [productos, setProductos] = useState<Producto[]>(
    PRODUCTOS_DEFAULT.map((p) => ({
      nombre: p.nombre,
      dias: p.dias.map(String),
      precios: p.precios.map(String),
      cantidad_diaria: String(p.cantidad_diaria),
      unidad: p.unidad,
    }))
  );
  const [ingresoMensual, setIngresoMensual] = useState("3000");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  // ── Manejo de productos ──────────────────────────────────────────────────

  function addProducto() {
    setProductos([...productos, {
      nombre: "Nuevo producto",
      dias: ["1", "10", "20", "30"],
      precios: ["10", "12", "15", "18"],
      cantidad_diaria: "1",
      unidad: "kg",
    }]);
  }

  function removeProducto(idx: number) {
    setProductos(productos.filter((_, i) => i !== idx));
  }

  function updateField(pIdx: number, field: keyof Producto, value: string) {
    setProductos(productos.map((p, i) => i === pIdx ? { ...p, [field]: value } : p));
  }

  function updateCell(pIdx: number, field: "dias" | "precios", cellIdx: number, value: string) {
    setProductos(productos.map((p, i) => {
      if (i !== pIdx) return p;
      const arr = [...p[field]];
      arr[cellIdx] = value;
      return { ...p, [field]: arr };
    }));
  }

  function addRow(pIdx: number) {
    setProductos(productos.map((p, i) =>
      i !== pIdx ? p : { ...p, dias: [...p.dias, ""], precios: [...p.precios, ""] }
    ));
  }

  function removeRow(pIdx: number, rowIdx: number) {
    setProductos(productos.map((p, i) =>
      i !== pIdx ? p : {
        ...p,
        dias: p.dias.filter((_, j) => j !== rowIdx),
        precios: p.precios.filter((_, j) => j !== rowIdx),
      }
    ));
  }

  // ── Calcular ─────────────────────────────────────────────────────────────

  async function handleSolve() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        method,
        ingreso_mensual: parseFloat(ingresoMensual) || 3000,
        productos: productos.map((p) => ({
          nombre: p.nombre,
          dias: p.dias.map(Number).filter((v) => !isNaN(v)),
          precios: p.precios.map(Number).filter((v) => !isNaN(v)),
          cantidad_diaria: parseFloat(p.cantidad_diaria) || 1,
          unidad: p.unidad,
        })),
      };
      const res = await api.post("/api/scenario-d/solve", payload);
      setResult(res.data);
      setActiveTab(0);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  // ── Conclusión por producto ──────────────────────────────────────────────

  function getConclusionProducto(prod: any) {
    const methodLabel = METHODS.find((m) => m.value === method)?.label;
    const metodos = prod.comparacion_metodos;
    const diff_trap_s13 = Math.abs(metodos.trapecio - metodos.simpson13).toFixed(2);

    return (
      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        <p>
          🛒 La familia gastó <strong className="text-white">{prod.gasto_real} Bs</strong> en{" "}
          <strong className="text-white">{prod.nombre}</strong> durante el mes.
          Si los precios no hubieran subido, habría gastado solo{" "}
          <strong className="text-green-400">{prod.gasto_sin_inflacion} Bs</strong>.
          La inflación le costó{" "}
          <strong className="text-red-400">{prod.perdida_bs} Bs adicionales</strong>{" "}
          ({prod.perdida_pct}% más de lo esperado).
        </p>

        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">
            🔬 Comparación entre los 3 métodos de integración para {prod.nombre}:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(metodos).map(([key, val]: any) => {
              const m = METHODS.find((x) => x.value === key);
              const isSelected = key === method;
              return (
                <div key={key}
                  className={`rounded-lg p-2 text-center border ${isSelected ? "border-white/30 bg-gray-700" : "border-gray-700 bg-gray-900"}`}>
                  <p className="text-xs font-medium mb-1" style={{ color: m?.color }}>{m?.label}</p>
                  <p className="text-base font-bold text-white">{val} Bs</p>
                  {isSelected && <p className="text-xs text-gray-400 mt-0.5">← método seleccionado</p>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Diferencia entre Trapecio y Simpson 1/3: <strong className="text-gray-300">{diff_trap_s13} Bs</strong>.
            {parseFloat(diff_trap_s13) < 1
              ? " La diferencia es mínima — todos los métodos son igualmente confiables para estos datos."
              : " Hay diferencia notable — Simpson es más preciso para curvas con mayor curvatura."}
          </p>
        </div>

        <p className="text-xs text-gray-500">
          💡 <strong className="text-gray-300">¿Qué significa la integración aquí?</strong>{" "}
          El gasto mensual es el <em>área bajo la curva de costo diario</em>. Si el costo sube cada día,
          el área es mayor. Los métodos numéricos calculan esa área sin necesidad de una fórmula exacta.
        </p>
      </div>
    );
  }

  // ── Conclusión general ───────────────────────────────────────────────────

  function getConclusionGeneral() {
    if (!result) return null;
    const pctIngreso = result.pct_ingreso_real;
    const critico = pctIngreso > 70;
    const methodInfo = METHODS.find((m) => m.value === method);

    return (
      <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">💸 Gasto real con inflación</p>
            <p className="text-2xl font-bold text-red-400">{result.gasto_total_real} Bs</p>
            <p className="text-xs text-gray-500 mt-1">
              Representa el <strong className="text-white">{result.pct_ingreso_real}%</strong> del ingreso mensual familiar.
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">✅ Gasto esperado sin inflación</p>
            <p className="text-2xl font-bold text-green-400">{result.gasto_total_sin_inflacion} Bs</p>
            <p className="text-xs text-gray-500 mt-1">
              Habría representado el <strong className="text-white">{result.pct_ingreso_base}%</strong> del ingreso mensual.
            </p>
          </div>
        </div>

        <div className={`rounded-xl px-4 py-3 border ${critico ? "bg-red-950/40 border-red-700" : "bg-yellow-950/40 border-yellow-700"}`}>
          <p className={`text-sm font-semibold mb-1 ${critico ? "text-red-300" : "text-yellow-300"}`}>
            {critico ? "🚨 Situación crítica" : "⚠️ Situación de alerta"}
          </p>
          <p className={`text-xs ${critico ? "text-red-200" : "text-yellow-200"}`}>
            La familia perdió <strong>{result.perdida_total_bs} Bs</strong> de poder adquisitivo
            ({result.perdida_total_pct}% más de lo que debería gastar).
            {critico
              ? " Más del 70% del ingreso se destina a la canasta básica — la familia está en situación de vulnerabilidad alimentaria."
              : " La inflación está afectando significativamente el presupuesto familiar."}
          </p>
        </div>

        <p>
          🏆 <strong className="text-white">Producto que más afectó el gasto:</strong>{" "}
          <strong className="text-yellow-400">{result.mayor_impacto}</strong> fue el que generó
          mayor pérdida de poder adquisitivo en términos absolutos (Bs).
        </p>

        <div className="bg-blue-950/40 border border-blue-700 rounded-xl px-4 py-3">
          <p className="text-blue-300 text-xs">
            🔬 <strong>Método usado: {methodInfo?.label}.</strong> {methodInfo?.desc}
            <br /><br />
            <strong>Fórmula:</strong> <code className="bg-blue-900/40 px-1 rounded">{methodInfo?.formula}</code>
          </p>
        </div>

        <p className="text-xs text-gray-500">
          📌 <strong className="text-gray-300">Nota metodológica:</strong> Los precios entre días registrados
          se estiman con Splines Cúbicos para obtener una curva continua. Luego se integra esa curva
          para calcular el gasto acumulado. El resultado es una aproximación — en la realidad los precios
          pueden variar de forma más abrupta.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold bg-purple-700 text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Escenario D · Integración Numérica
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Costo Acumulado y Pérdida del Poder Adquisitivo Familiar
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Cuando los precios suben cada día, el gasto mensual de una familia no es simplemente
          "precio × 30 días" — porque el precio cambia cada día. La{" "}
          <strong className="text-white">integración numérica</strong> calcula el área bajo la curva
          de precios, que representa el gasto real acumulado durante todo el mes.
        </p>
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 max-w-2xl">
          <p className="text-xs text-gray-400">
            <strong className="text-white">¿Qué es integrar aquí?</strong>{" "}
            Imagina que graficas el costo diario de la papa a lo largo del mes — una curva que sube.
            El <em>área bajo esa curva</em> es exactamente cuánto gastó la familia en papa ese mes.
            Como no tenemos una fórmula exacta, usamos métodos numéricos (Trapecio, Simpson) para
            calcular esa área de forma aproximada.
          </p>
        </div>
      </div>

      {/* Sección 1: Ingreso familiar */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">1. Ingreso mensual familiar</h2>
        <p className="text-xs text-gray-500 mb-4">
          Ingresa el ingreso mensual total de la familia en Bolivianos. Este dato se usa para calcular
          qué porcentaje del ingreso se destina a la canasta básica y cuánto poder adquisitivo se pierde
          por la inflación. El salario mínimo en Bolivia es aproximadamente <strong className="text-gray-300">2.500 Bs</strong>.
        </p>
        <div className="flex items-center gap-3 max-w-xs">
          <input
            type="number"
            min={500}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm w-full focus:border-purple-500 focus:outline-none"
            value={ingresoMensual}
            onChange={(e) => setIngresoMensual(e.target.value)}
            placeholder="Ej: 3000"
          />
          <span className="text-sm text-gray-400 whitespace-nowrap">Bs / mes</span>
        </div>
      </div>

      {/* Sección 2: Productos de la canasta */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">2. Productos de la canasta básica</h2>
        <p className="text-xs text-gray-500 mb-5">
          Ingresa los productos que compra la familia diariamente. Para cada uno necesitas:
          los <strong className="text-gray-300">días con precio registrado</strong>,
          el <strong className="text-gray-300">precio en Bs</strong> de ese día, y
          la <strong className="text-gray-300">cantidad que compra la familia por día</strong> (ej: 1 kg de papa, 0.5 kg de arroz).
          Los precios entre días se estimarán automáticamente con interpolación.
        </p>

        <div className="space-y-6">
          {productos.map((prod, pIdx) => (
            <div key={pIdx} className="bg-gray-800 rounded-xl p-4 border border-gray-700">

              {/* Cabecera */}
              <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[pIdx % COLORS.length] }} />
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Nombre del producto</label>
                      <input
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm font-semibold w-44"
                        value={prod.nombre}
                        onChange={(e) => updateField(pIdx, "nombre", e.target.value)}
                        placeholder="Ej: Papa, Arroz..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Cantidad diaria
                      <span className="block font-normal text-gray-600">¿Cuánto compra por día?</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0.01} step={0.1}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-24 focus:border-purple-500 focus:outline-none"
                        value={prod.cantidad_diaria}
                        onChange={(e) => updateField(pIdx, "cantidad_diaria", e.target.value)}
                        placeholder="1"
                      />
                      <select
                        className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                        value={prod.unidad}
                        onChange={(e) => updateField(pIdx, "unidad", e.target.value)}>
                        <option value="kg">kg</option>
                        <option value="litro">litro</option>
                        <option value="unidad">unidad</option>
                        <option value="bolsa">bolsa</option>
                        <option value="caja">caja</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Costo diario inicial ≈ {(parseFloat(prod.precios[0] || "0") * parseFloat(prod.cantidad_diaria || "0")).toFixed(2)} Bs
                    </p>
                  </div>
                </div>
                {productos.length > 1 && (
                  <button onClick={() => removeProducto(pIdx)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg px-3 py-1.5 transition">
                    ✕ Eliminar
                  </button>
                )}
              </div>

              {/* Tabla de precios */}
              <p className="text-xs text-gray-500 mb-2">
                Registros de precio del producto (días en que se anotó el precio en el mercado):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-3 py-2 text-left text-xs text-gray-400 w-10">#</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-400">
                        📅 Día del mes
                        <span className="block font-normal text-gray-600">Del 1 al 30</span>
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-400">
                        💰 Precio por {prod.unidad} (Bs)
                        <span className="block font-normal text-gray-600">Precio en ese día</span>
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-400">
                        🧮 Costo diario estimado
                        <span className="block font-normal text-gray-600">precio × cantidad</span>
                      </th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prod.dias.map((dia, rowIdx) => {
                      const costoEstimado = (parseFloat(prod.precios[rowIdx] || "0") * parseFloat(prod.cantidad_diaria || "0")).toFixed(2);
                      return (
                        <tr key={rowIdx} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                          <td className="px-3 py-2 text-gray-500 text-xs">{rowIdx + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min={1} max={30}
                              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-24 focus:border-purple-500 focus:outline-none"
                              value={dia}
                              onChange={(e) => updateCell(pIdx, "dias", rowIdx, e.target.value)}
                              placeholder="Ej: 5"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min={0} step={0.5}
                                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-24 focus:border-purple-500 focus:outline-none"
                                value={prod.precios[rowIdx] ?? ""}
                                onChange={(e) => updateCell(pIdx, "precios", rowIdx, e.target.value)}
                                placeholder="Ej: 8.5"
                              />
                              <span className="text-xs text-gray-500">Bs</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-400">
                            {costoEstimado} Bs/día
                          </td>
                          <td className="px-3 py-2">
                            {prod.dias.length > 3 && (
                              <button onClick={() => removeRow(pIdx, rowIdx)}
                                className="text-gray-600 hover:text-red-400 transition text-lg leading-none">✕</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={() => addRow(pIdx)}
                className="mt-3 text-xs border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 px-3 py-1.5 rounded-lg transition">
                + Agregar fila
              </button>
            </div>
          ))}
        </div>

        <button onClick={addProducto}
          className="mt-4 text-sm border border-purple-700 text-purple-400 hover:bg-purple-900/30 px-4 py-2 rounded-xl transition">
          + Agregar producto a la canasta
        </button>
      </div>

      {/* Sección 3: Método */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">3. Método de integración</h2>
        <p className="text-xs text-gray-500 mb-5">
          Elige cómo se calculará el área bajo la curva de costos. El resultado final mostrará
          también la comparación entre los 3 métodos para que puedas ver cuál es más preciso.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {METHODS.map((m) => (
            <button key={m.value} onClick={() => setMethod(m.value)}
              className={`text-left p-4 rounded-xl border-2 transition ${
                method === m.value ? "bg-gray-800" : "border-gray-700 hover:border-gray-500"
              }`}
              style={{ borderColor: method === m.value ? m.color : undefined }}>
              <p className="text-sm font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
              <p className="text-xs text-gray-400 mb-2">{m.desc}</p>
              <code className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded block">{m.formula}</code>
            </button>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button onClick={handleSolve} disabled={loading}
        className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition mb-8">
        {loading ? "Calculando gasto mensual..." : "▶ Calcular pérdida del poder adquisitivo"}
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {result && (
        <>
          {/* KPIs globales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Gasto real (con inflación)</p>
              <p className="text-2xl font-bold text-red-400">{result.gasto_total_real} Bs</p>
              <p className="text-xs text-gray-600">durante el mes</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Gasto esperado (sin inflación)</p>
              <p className="text-2xl font-bold text-green-400">{result.gasto_total_sin_inflacion} Bs</p>
              <p className="text-xs text-gray-600">si los precios no subían</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Pérdida de poder adquisitivo</p>
              <p className="text-2xl font-bold text-orange-400">{result.perdida_total_bs} Bs</p>
              <p className="text-xs text-gray-600">+{result.perdida_total_pct}% de más</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">% del ingreso familiar</p>
              <p className={`text-2xl font-bold ${result.pct_ingreso_real > 70 ? "text-red-400" : result.pct_ingreso_real > 50 ? "text-yellow-400" : "text-white"}`}>
                {result.pct_ingreso_real}%
              </p>
              <p className="text-xs text-gray-600">de {result.ingreso_mensual} Bs/mes</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {result.productos.map((p: any, idx: number) => (
              <button key={idx} onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border`}
                style={{
                  backgroundColor: activeTab === idx ? COLORS[idx % COLORS.length] + "33" : undefined,
                  borderColor: activeTab === idx ? COLORS[idx % COLORS.length] : "#374151",
                  color: activeTab === idx ? "white" : "#9ca3af",
                }}>
                {p.nombre}
              </button>
            ))}
            <button onClick={() => setActiveTab(result.productos.length)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                activeTab === result.productos.length
                  ? "bg-gray-700 border-gray-500 text-white"
                  : "border-gray-700 text-gray-400 hover:text-white"
              }`}>
              📊 Resumen general
            </button>
          </div>

          {/* Tab individual */}
          {activeTab < result.productos.length && (() => {
            const prod = result.productos[activeTab];
            const color = COLORS[activeTab % COLORS.length];

            const chartData = prod.dias.map((d: number, i: number) => ({
              dia: d,
              "Costo real (Bs/día)": prod.costos_diarios[i],
              "Sin inflación (Bs/día)": prod.costos_sin_inflacion[i],
            }));

            return (
              <div>
                {/* KPIs del producto */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Precio inicial</p>
                    <p className="text-xl font-bold text-white">{prod.precio_inicial} Bs/{prod.unidad}</p>
                    <p className="text-xs text-gray-600">Día 1</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Precio final</p>
                    <p className="text-xl font-bold text-red-400">{prod.precio_final} Bs/{prod.unidad}</p>
                    <p className="text-xs text-gray-600">Día 30</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Gasto mensual real</p>
                    <p className="text-xl font-bold text-orange-400">{prod.gasto_real} Bs</p>
                    <p className="text-xs text-gray-600">{prod.cantidad_diaria} {prod.unidad}/día</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Pérdida por inflación</p>
                    <p className="text-xl font-bold text-red-400">+{prod.perdida_bs} Bs</p>
                    <p className="text-xs text-gray-600">+{prod.perdida_pct}% de más</p>
                  </div>
                </div>

                {/* Gráfico de costo diario */}
                <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-1">Costo diario — {prod.nombre}</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    La <strong className="text-gray-300">línea naranja</strong> muestra cuánto gastó la familia
                    en {prod.nombre} cada día (precio real × {prod.cantidad_diaria} {prod.unidad}).
                    La <strong className="text-gray-300">línea verde</strong> muestra cuánto habría gastado
                    si el precio se hubiera mantenido igual al del día 1.
                    El <strong className="text-gray-300">área entre las dos curvas</strong> es la pérdida acumulada.
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="dia" stroke="#9ca3af" tick={{ fontSize: 11 }}
                        label={{ value: "Día del mes", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                        label={{ value: "Costo (Bs/día)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(val: any) => [`${val} Bs`]}
                        labelFormatter={(l) => `Día ${l}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Costo real (Bs/día)" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Sin inflación (Bs/día)" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Conclusión */}
                <div className="bg-purple-950/30 border border-purple-800 rounded-2xl p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-3 text-purple-300">
                    📊 Análisis de {prod.nombre}
                  </h2>
                  {getConclusionProducto(prod)}
                </div>
              </div>
            );
          })()}

          {/* Tab resumen general */}
          {activeTab === result.productos.length && (
            <>
              {/* Gráfico de barras comparativo */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-1">Gasto mensual por producto</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Comparación del gasto real vs. el gasto esperado sin inflación para cada producto.
                  La diferencia entre las barras es la pérdida de poder adquisitivo.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={result.productos.map((p: any) => ({
                    nombre: p.nombre,
                    "Gasto real": p.gasto_real,
                    "Sin inflación": p.gasto_sin_inflacion,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="nombre" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                      label={{ value: "Bs / mes", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} Bs`]}
                    />
                    <Legend />
                    <Bar dataKey="Gasto real" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sin inflación" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla comparativa */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-1">Tabla de impacto por producto</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Resumen del impacto de la inflación en cada producto de la canasta básica.
                </p>
                <div className="overflow-x-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-2 text-left text-gray-400">Producto</th>
                        <th className="px-4 py-2 text-center text-gray-400">Gasto real</th>
                        <th className="px-4 py-2 text-center text-gray-400">Sin inflación</th>
                        <th className="px-4 py-2 text-center text-gray-400">Pérdida (Bs)</th>
                        <th className="px-4 py-2 text-center text-gray-400">Pérdida (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...result.productos]
                        .sort((a: any, b: any) => b.perdida_bs - a.perdida_bs)
                        .map((p: any) => (
                          <tr key={p.nombre} className="border-t border-gray-800 hover:bg-gray-800/50">
                            <td className="px-4 py-2 font-medium text-white">{p.nombre}</td>
                            <td className="px-4 py-2 text-center text-orange-400 font-semibold">{p.gasto_real} Bs</td>
                            <td className="px-4 py-2 text-center text-green-400">{p.gasto_sin_inflacion} Bs</td>
                            <td className="px-4 py-2 text-center text-red-400 font-semibold">+{p.perdida_bs} Bs</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`font-bold ${p.perdida_pct > 30 ? "text-red-400" : "text-yellow-400"}`}>
                                +{p.perdida_pct}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      <tr className="border-t-2 border-gray-600 bg-gray-800/50">
                        <td className="px-4 py-2 font-bold text-white">TOTAL CANASTA</td>
                        <td className="px-4 py-2 text-center text-orange-400 font-bold">{result.gasto_total_real} Bs</td>
                        <td className="px-4 py-2 text-center text-green-400 font-bold">{result.gasto_total_sin_inflacion} Bs</td>
                        <td className="px-4 py-2 text-center text-red-400 font-bold">+{result.perdida_total_bs} Bs</td>
                        <td className="px-4 py-2 text-center font-bold text-red-400">+{result.perdida_total_pct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conclusión general */}
              <div className="bg-purple-950/30 border border-purple-800 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-3 text-purple-300">📊 Conclusión general</h2>
                {getConclusionGeneral()}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}