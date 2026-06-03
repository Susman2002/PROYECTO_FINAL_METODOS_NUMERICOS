"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart
} from "recharts";

// ─── Constantes ──────────────────────────────────────────────────────────────

const METHODS = [
  {
    value: "lagrange",
    label: "Lagrange",
    color: "#f59e0b",
    desc: "Construye un único polinomio que pasa exactamente por todos los puntos conocidos. Simple pero puede oscilar mucho si hay muchos datos.",
  },
  {
    value: "newton",
    label: "Newton (Diferencias Divididas)",
    color: "#10b981",
    desc: "Similar a Lagrange pero más eficiente. Permite agregar nuevos puntos sin recalcular todo. Usa una tabla de diferencias para construir el polinomio.",
  },
  {
    value: "spline",
    label: "Splines Cúbicos",
    color: "#3b82f6",
    desc: "Divide la curva en tramos y ajusta una curva suave en cada uno. Es el más estable y realista para datos de precios. Evita las oscilaciones bruscas.",
  },
];

const ALIMENTOS_DEFAULT = [
  { nombre: "Papa", dias: [1, 5, 10, 15, 20, 30], precios: [8, 10, 13, 16, 19, 22] },
  { nombre: "Arroz (kg)", dias: [1, 5, 10, 15, 20, 30], precios: [5, 5.5, 6, 7, 8, 9] },
];

const COLORS_ALIMENTOS = ["#f59e0b", "#10b981", "#3b82f6", "#a78bfa", "#f43f5e", "#06b6d4"];

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Alimento = { nombre: string; dias: string[]; precios: string[] };

// ─── Componente principal ────────────────────────────────────────────────────

export default function EscenarioC() {
  const [method, setMethod] = useState("spline");
  const [alimentos, setAlimentos] = useState<Alimento[]>(
    ALIMENTOS_DEFAULT.map((a) => ({
      nombre: a.nombre,
      dias: a.dias.map(String),
      precios: a.precios.map(String),
    }))
  );
  const [diasConsulta, setDiasConsulta] = useState<string[]>(["3", "7", "12", "25"]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  // ── Manejo de alimentos ──────────────────────────────────────────────────

  function addAlimento() {
    setAlimentos([...alimentos, {
      nombre: "Nuevo producto",
      dias: ["1", "10", "20", "30"],
      precios: ["10", "12", "15", "18"],
    }]);
  }

  function removeAlimento(idx: number) {
    setAlimentos(alimentos.filter((_, i) => i !== idx));
  }

  function updateNombre(idx: number, value: string) {
    const updated = [...alimentos];
    updated[idx] = { ...updated[idx], nombre: value };
    setAlimentos(updated);
  }

  function updateCell(alIdx: number, field: "dias" | "precios", cellIdx: number, value: string) {
    const updated = alimentos.map((al, i) => {
      if (i !== alIdx) return al;
      const arr = [...al[field]];
      arr[cellIdx] = value;
      return { ...al, [field]: arr };
    });
    setAlimentos(updated);
  }

  function addRow(alIdx: number) {
    const updated = alimentos.map((al, i) => {
      if (i !== alIdx) return al;
      return { ...al, dias: [...al.dias, ""], precios: [...al.precios, ""] };
    });
    setAlimentos(updated);
  }

  function removeRow(alIdx: number, rowIdx: number) {
    const updated = alimentos.map((al, i) => {
      if (i !== alIdx) return al;
      return {
        ...al,
        dias: al.dias.filter((_, j) => j !== rowIdx),
        precios: al.precios.filter((_, j) => j !== rowIdx),
      };
    });
    setAlimentos(updated);
  }

  // ── Días a consultar ─────────────────────────────────────────────────────

  function updateDiaConsulta(idx: number, value: string) {
    const updated = [...diasConsulta];
    updated[idx] = value;
    setDiasConsulta(updated);
  }

  function addDiaConsulta() {
    setDiasConsulta([...diasConsulta, ""]);
  }

  function removeDiaConsulta(idx: number) {
    setDiasConsulta(diasConsulta.filter((_, i) => i !== idx));
  }

  // ── Calcular ─────────────────────────────────────────────────────────────

  async function handleSolve() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const dias_consulta = diasConsulta
        .map((v) => parseFloat(v)).filter((v) => !isNaN(v));

      const alimentosParsed = alimentos.map((al) => ({
        nombre: al.nombre,
        dias: al.dias.map((v) => parseFloat(v)).filter((v) => !isNaN(v)),
        precios: al.precios.map((v) => parseFloat(v)).filter((v) => !isNaN(v)),
      }));

      const res = await api.post("/api/scenario-c/solve", {
        alimentos: alimentosParsed,
        dias_consulta,
        method,
      });
      setResult(res.data);
      setActiveTab(0);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  // ── Gráfico ──────────────────────────────────────────────────────────────

  function buildChartData(alimento: any) {
    // Curva interpolada
    const curva = alimento.curva_dias.map((d: number, i: number) => ({
      dia: d,
      interpolado: alimento.curva_precios[i],
    }));
    return curva;
  }

  function buildScatterData(alimento: any) {
    return alimento.dias_conocidos.map((d: number, i: number) => ({
      dia: d,
      precio: alimento.precios_conocidos[i],
    }));
  }

  // ── Conclusión por alimento ──────────────────────────────────────────────

  function getConclusion(alimento: any) {
    const methodLabel = METHODS.find((m) => m.value === method)?.label;
    const estimados = alimento.dias_consulta.map((d: number, i: number) => ({
      dia: d,
      precio: alimento.precios_estimados[i],
    }));

    const hayOscilacion = alimento.curva_precios.some((p: number) => p < 0 || p > alimento.precio_max * 2);

    return (
      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        <p>
          📦 <strong className="text-white">{alimento.nombre}:</strong> El precio pasó de{" "}
          <strong className="text-white">{alimento.precio_min} Bs</strong> (día {alimento.dia_precio_min}) a{" "}
          <strong className="text-white">{alimento.precio_max} Bs</strong> (día {alimento.dia_precio_max}),
          un incremento del{" "}
          <strong className={alimento.incremento_pct > 30 ? "text-red-400" : "text-yellow-400"}>
            {alimento.incremento_pct}%
          </strong>{" "}
          durante el período analizado.
        </p>

        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">
            📅 Precios estimados con {methodLabel} en los días consultados:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {estimados.map((e: any) => (
              <div key={e.dia} className="bg-gray-900 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Día {e.dia}</p>
                <p className="text-base font-bold text-white">{e.precio} Bs</p>
              </div>
            ))}
          </div>
        </div>

        {hayOscilacion && (
          <div className="bg-yellow-950/40 border border-yellow-700 rounded-xl px-4 py-3">
            <p className="text-yellow-300 text-xs">
              ⚠️ <strong>Advertencia de oscilación:</strong> El método {methodLabel} está generando valores
              poco realistas en algunos puntos. Esto ocurre cuando los datos están muy separados o hay
              pocos puntos. Se recomienda usar <strong>Splines Cúbicos</strong> para mayor estabilidad.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          💡 <strong className="text-gray-300">¿Qué significa esto?</strong> La interpolación NO predice el futuro.
          Estima qué precio habría tenido el producto en un día donde no se tomó dato, asumiendo que
          la tendencia entre los datos conocidos fue continua y suave.
        </p>
      </div>
    );
  }

  // ── Conclusión general ───────────────────────────────────────────────────

  function getConclusionGeneral() {
    if (!result) return null;
    const methodInfo = METHODS.find((m) => m.value === method);
    const alimentos_sorted = [...result.alimentos].sort((a, b) => b.incremento_pct - a.incremento_pct);

    return (
      <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
        <p>
          🏆 <strong className="text-white">Producto con mayor incremento:</strong>{" "}
          <strong className="text-yellow-400">{result.mayor_incremento}</strong> fue el producto
          que más subió de precio durante el período analizado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {alimentos_sorted.map((a: any) => (
            <div key={a.nombre} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
              <p className="text-sm font-semibold text-white mb-1">{a.nombre}</p>
              <p className="text-xs text-gray-400">
                Incremento: <strong className={a.incremento_pct > 30 ? "text-red-400" : "text-yellow-400"}>
                  +{a.incremento_pct}%
                </strong>
              </p>
              <p className="text-xs text-gray-400">
                De {a.precio_min} Bs → {a.precio_max} Bs
              </p>
            </div>
          ))}
        </div>

        <div className="bg-blue-950/40 border border-blue-700 rounded-xl px-4 py-3">
          <p className="text-blue-300 text-xs">
            🔬 <strong>Método usado: {methodInfo?.label}.</strong> {methodInfo?.desc}
          </p>
        </div>

        <p className="text-xs text-gray-500">
          ⚠️ <strong className="text-gray-300">Confiabilidad:</strong> La interpolación es más confiable
          cuando los datos están distribuidos uniformemente y no hay saltos bruscos. Si los datos están
          muy separados (ej: solo día 1 y día 30), la curva entre ellos es una estimación y puede no
          reflejar la realidad.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold bg-green-700 text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Escenario C · Interpolación Numérica
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Desabastecimiento de Alimentos y Curva de Precios
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Durante los bloqueos en Bolivia, los precios de productos básicos como papa, arroz o azúcar
          suben de forma irregular. Solo tenemos datos de algunos días (cuando alguien registró el precio),
          pero necesitamos saber qué pasó los días sin dato. La <strong className="text-white">interpolación numérica</strong>{" "}
          construye una curva continua que conecta esos puntos conocidos y estima los valores intermedios.
        </p>
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 max-w-2xl">
          <p className="text-xs text-gray-400">
            <strong className="text-white">¿Qué es la interpolación?</strong>{" "}
            Imagina que tienes el precio del día 1 y del día 10, pero no del día 5.
            La interpolación "dibuja" la curva más lógica entre esos puntos y te dice:{" "}
            <em>"el día 5 el precio probablemente era X Bs"</em>.
            No es predicción del futuro, es estimación del pasado donde no hay datos.
          </p>
        </div>
      </div>

      {/* Sección 1: Alimentos */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">1. Productos y precios registrados</h2>
        <p className="text-xs text-gray-500 mb-5">
          Ingresa cada producto con sus registros de precio. Cada fila es un día en que se anotó el precio.
          Puedes agregar o quitar filas con los botones <strong className="text-gray-300">+ Agregar fila</strong> y <strong className="text-gray-300">✕</strong>.
          Mínimo <strong className="text-gray-300">3 filas</strong> por producto para que la interpolación funcione bien.
        </p>

        <div className="space-y-6">
          {alimentos.map((al, alIdx) => (
            <div key={alIdx} className="bg-gray-800 rounded-xl p-4 border border-gray-700">

              {/* Cabecera del producto */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS_ALIMENTOS[alIdx % COLORS_ALIMENTOS.length] }} />
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Nombre del producto</label>
                    <input
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm font-semibold w-52"
                      value={al.nombre}
                      onChange={(e) => updateNombre(alIdx, e.target.value)}
                      placeholder="Ej: Papa, Arroz, Azúcar..."
                    />
                  </div>
                </div>
                {alimentos.length > 1 && (
                  <button onClick={() => removeAlimento(alIdx)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg px-3 py-1.5 transition">
                    ✕ Eliminar producto
                  </button>
                )}
              </div>

              {/* Tabla de datos */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-3 py-2 text-left text-xs text-gray-400 w-12">#</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-400">
                        📅 Día del mes
                        <span className="block font-normal text-gray-600 mt-0.5">¿En qué día se registró?</span>
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-400">
                        💰 Precio (Bs)
                        <span className="block font-normal text-gray-600 mt-0.5">¿Cuánto costaba ese día?</span>
                      </th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {al.dias.map((dia, rowIdx) => (
                      <tr key={rowIdx} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-3 py-2 text-gray-500 text-xs">{rowIdx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1} max={31}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-28 focus:border-green-500 focus:outline-none"
                            value={dia}
                            onChange={(e) => updateCell(alIdx, "dias", rowIdx, e.target.value)}
                            placeholder="Ej: 5"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0} step={0.5}
                              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-28 focus:border-green-500 focus:outline-none"
                              value={al.precios[rowIdx] ?? ""}
                              onChange={(e) => updateCell(alIdx, "precios", rowIdx, e.target.value)}
                              placeholder="Ej: 8.5"
                            />
                            <span className="text-xs text-gray-500">Bs</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {al.dias.length > 3 && (
                            <button onClick={() => removeRow(alIdx, rowIdx)}
                              className="text-gray-600 hover:text-red-400 transition text-lg leading-none">
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => addRow(alIdx)}
                className="mt-3 text-xs border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 px-3 py-1.5 rounded-lg transition">
                + Agregar fila
              </button>
              <p className="text-xs text-gray-600 mt-2">
                {al.dias.length} registro{al.dias.length !== 1 ? "s" : ""} ingresado{al.dias.length !== 1 ? "s" : ""}.
                {al.dias.length < 3 && <span className="text-yellow-500"> ⚠️ Agrega al menos 3 filas.</span>}
              </p>
            </div>
          ))}
        </div>

        <button onClick={addAlimento}
          className="mt-4 text-sm border border-green-700 text-green-400 hover:bg-green-900/30 px-4 py-2 rounded-xl transition">
          + Agregar otro producto
        </button>
      </div>

      {/* Sección 2: Días a consultar */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">2. Días a estimar</h2>
        <p className="text-xs text-gray-500 mb-4">
          ¿En qué días quieres saber el precio estimado? Deben ser días{" "}
          <strong className="text-gray-300">sin dato registrado</strong> para que la interpolación tenga sentido.
          Por ejemplo, si tienes datos del día 1, 5 y 10, puedes consultar el día 3 o el día 7.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          {diasConsulta.map((d, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Día {idx + 1}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1} max={31}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-20 focus:border-green-500 focus:outline-none"
                  value={d}
                  onChange={(e) => updateDiaConsulta(idx, e.target.value)}
                  placeholder="Día"
                />
                {diasConsulta.length > 1 && (
                  <button onClick={() => removeDiaConsulta(idx)}
                    className="text-gray-600 hover:text-red-400 transition text-base">✕</button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addDiaConsulta}
            className="text-xs border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 px-3 py-2 rounded-lg transition h-9">
            + Día
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Actualmente estimarás el precio en {diasConsulta.filter(d => d !== "").length} día(s): {diasConsulta.filter(d => d !== "").join(", ")}.
        </p>
      </div>

      {/* Sección 3: Método */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">3. Método de interpolación</h2>
        <p className="text-xs text-gray-500 mb-5">
          Elige cómo se construirá la curva entre los puntos conocidos.
          El gráfico mostrará la curva del método seleccionado junto con los puntos reales.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {METHODS.map((m) => (
            <button key={m.value} onClick={() => setMethod(m.value)}
              className={`text-left p-4 rounded-xl border-2 transition ${
                method === m.value ? "bg-gray-800" : "border-gray-700 hover:border-gray-500"
              }`}
              style={{ borderColor: method === m.value ? m.color : undefined }}>
              <p className="text-sm font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
              <p className="text-xs text-gray-400">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button onClick={handleSolve} disabled={loading}
        className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition mb-8">
        {loading ? "Calculando curvas..." : "▶ Calcular curva de precios"}
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {result && (
        <>
          {/* Tabs por alimento */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {result.alimentos.map((al: any, idx: number) => (
              <button key={idx} onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                  activeTab === idx
                    ? "text-white border-transparent"
                    : "border-gray-700 text-gray-400 hover:text-white"
                }`}
                style={{ backgroundColor: activeTab === idx ? COLORS_ALIMENTOS[idx % COLORS_ALIMENTOS.length] + "33" : undefined,
                  borderColor: activeTab === idx ? COLORS_ALIMENTOS[idx % COLORS_ALIMENTOS.length] : undefined }}>
                {al.nombre}
              </button>
            ))}
            <button onClick={() => setActiveTab(result.alimentos.length)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                activeTab === result.alimentos.length
                  ? "bg-gray-700 border-gray-500 text-white"
                  : "border-gray-700 text-gray-400 hover:text-white"
              }`}>
              📊 Comparación general
            </button>
          </div>

          {/* Tab individual por alimento */}
          {activeTab < result.alimentos.length && (() => {
            const al = result.alimentos[activeTab];
            const color = COLORS_ALIMENTOS[activeTab % COLORS_ALIMENTOS.length];
            const chartData = buildChartData(al);
            const scatterData = buildScatterData(al);

            return (
              <div>
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Precio mínimo</p>
                    <p className="text-2xl font-bold text-green-400">{al.precio_min} Bs</p>
                    <p className="text-xs text-gray-600">Día {al.dia_precio_min}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Precio máximo</p>
                    <p className="text-2xl font-bold text-red-400">{al.precio_max} Bs</p>
                    <p className="text-xs text-gray-600">Día {al.dia_precio_max}</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Incremento total</p>
                    <p className={`text-2xl font-bold ${al.incremento_pct > 30 ? "text-red-400" : "text-yellow-400"}`}>
                      +{al.incremento_pct}%
                    </p>
                    <p className="text-xs text-gray-600">durante el período</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Puntos de datos</p>
                    <p className="text-2xl font-bold text-white">{al.dias_conocidos.length}</p>
                    <p className="text-xs text-gray-600">días registrados</p>
                  </div>
                </div>

                {/* Gráfico */}
                <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-1">Curva de precios — {al.nombre}</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    La <strong className="text-gray-300">línea continua</strong> es la curva interpolada (estimación entre puntos).
                    Los <strong className="text-gray-300">puntos marcados</strong> son los datos reales registrados.
                    Los puntos estimados en los días consultados se muestran en la tabla debajo.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="dia" stroke="#9ca3af" tick={{ fontSize: 11 }}
                        label={{ value: "Día del mes", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                        label={{ value: "Precio (Bs)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(val: any) => [`${val} Bs`]}
                        labelFormatter={(l) => `Día ${l}`}
                      />
                      <Line type="monotone" dataKey="interpolado" stroke={color}
                        strokeWidth={2} dot={false} name="Curva interpolada" />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Puntos reales superpuestos */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scatterData.map((pt: any) => (
                      <span key={pt.dia} className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
                        📍 Día {pt.dia}: <strong>{pt.precio} Bs</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tabla de estimados */}
                <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-1">Precios estimados en días consultados</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Estos son los precios que el método calcula para los días donde no había dato registrado.
                    Son estimaciones basadas en la tendencia de los datos conocidos.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-sm w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-4 py-2 text-left text-gray-400">Día consultado</th>
                          <th className="px-4 py-2 text-center text-gray-400">Precio estimado</th>
                          <th className="px-4 py-2 text-left text-gray-400">Interpretación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {al.dias_consulta.map((d: number, i: number) => {
                          const precio = al.precios_estimados[i];
                          const esRazonable = precio > 0 && precio < al.precio_max * 3;
                          return (
                            <tr key={d} className="border-t border-gray-800 hover:bg-gray-800/50">
                              <td className="px-4 py-2 text-gray-300">Día {d}</td>
                              <td className={`px-4 py-2 text-center font-bold ${esRazonable ? "text-white" : "text-red-400"}`}>
                                {precio} Bs
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {esRazonable
                                  ? `Estimación confiable. El precio estaría entre ${al.precio_min} y ${al.precio_max} Bs.`
                                  : "⚠️ Valor fuera de rango. Posible oscilación del método. Prueba con Splines."}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Conclusión individual */}
                <div className="bg-green-950/30 border border-green-800 rounded-2xl p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-3 text-green-300">
                    📊 Análisis de {al.nombre}
                  </h2>
                  {getConclusion(al)}
                </div>
              </div>
            );
          })()}

          {/* Tab comparación general */}
          {activeTab === result.alimentos.length && (
            <>
              {/* Gráfico comparativo */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-1">Comparación de curvas de precios</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Todos los productos en un mismo gráfico. Permite ver cuál subió más rápido y cuál fue más estable.
                  El eje Y muestra el precio en Bolivianos y el eje X el día del mes.
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="dia" type="number" domain={[1, 30]} stroke="#9ca3af" tick={{ fontSize: 11 }}
                      label={{ value: "Día del mes", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                      label={{ value: "Precio (Bs)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} Bs`]}
                      labelFormatter={(l) => `Día ${l}`}
                    />
                    <Legend />
                    {result.alimentos.map((al: any, idx: number) => (
                      <Line key={al.nombre} data={buildChartData(al)} type="monotone"
                        dataKey="interpolado" stroke={COLORS_ALIMENTOS[idx % COLORS_ALIMENTOS.length]}
                        strokeWidth={2} dot={false} name={al.nombre} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla comparativa */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-1">Tabla comparativa de incrementos</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Resumen del comportamiento de precios de todos los productos analizados.
                </p>
                <table className="text-sm w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-2 text-left text-gray-400">Producto</th>
                      <th className="px-4 py-2 text-center text-gray-400">Precio inicial</th>
                      <th className="px-4 py-2 text-center text-gray-400">Precio final</th>
                      <th className="px-4 py-2 text-center text-gray-400">Incremento</th>
                      <th className="px-4 py-2 text-center text-gray-400">Puntos de datos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...result.alimentos]
                      .sort((a: any, b: any) => b.incremento_pct - a.incremento_pct)
                      .map((al: any, idx: number) => (
                        <tr key={al.nombre} className="border-t border-gray-800 hover:bg-gray-800/50">
                          <td className="px-4 py-2 font-medium text-white">{al.nombre}</td>
                          <td className="px-4 py-2 text-center text-gray-300">{al.precio_min} Bs</td>
                          <td className="px-4 py-2 text-center text-gray-300">{al.precio_max} Bs</td>
                          <td className={`px-4 py-2 text-center font-bold ${al.incremento_pct > 30 ? "text-red-400" : "text-yellow-400"}`}>
                            +{al.incremento_pct}%
                          </td>
                          <td className="px-4 py-2 text-center text-gray-500">{al.dias_conocidos.length} días</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Conclusión general */}
              <div className="bg-green-950/30 border border-green-800 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-3 text-green-300">📊 Conclusión general</h2>
                {getConclusionGeneral()}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}