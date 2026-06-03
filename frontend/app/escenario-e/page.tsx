"use client";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── Constantes ──────────────────────────────────────────────────────────────

const MODELS = [
  {
    value: "costo",
    label: "💸 Colapso del presupuesto familiar",
    color: "#f59e0b",
    desc: "Encuentra el día exacto en que el gasto acumulado supera los ingresos y ahorros de la familia. La función representa el saldo disponible: cuando llega a cero, la familia no puede comprar más.",
    params: ["ingreso_mensual", "ahorro_inicial", "costo_base", "tasa_inflacion"],
    a_label: "Día inicial (ej: 1)", b_label: "Día máximo a evaluar (ej: 60)",
    x0_label: "Estimación inicial del día crítico (ej: 20)",
    x_unit: "días",
  },
  {
    value: "carburante",
    label: "⛽ Tasa crítica de reposición de carburante",
    color: "#3b82f6",
    desc: "Encuentra la tasa mínima de llegada de carburante (litros/día) para que las reservas no lleguen a cero durante el bloqueo. Si la reposición real es menor a este umbral, hay desabastecimiento.",
    params: ["consumo_diario", "reserva_actual", "dias_bloqueo"],
    a_label: "Tasa mínima a evaluar (ej: 0)", b_label: "Tasa máxima a evaluar (ej: 5000)",
    x0_label: "Estimación inicial de tasa crítica (ej: 2500)",
    x_unit: "litros/día",
  },
  {
    value: "social",
    label: "📢 Umbral de masificación social",
    color: "#a78bfa",
    desc: "Encuentra el número de personas movilizadas a partir del cual el movimiento social se vuelve autosostenible y se masifica. Basado en un modelo logístico de difusión social.",
    params: ["poblacion", "tasa_contagio", "umbral_critico"],
    a_label: "Personas mínimas a evaluar (ej: 0)", b_label: "Personas máximas (ej: 100000)",
    x0_label: "Estimación inicial de umbral (ej: 30000)",
    x_unit: "personas",
  },
];

const METHODS = [
  {
    value: "biseccion",
    label: "Bisección",
    color: "#f59e0b",
    desc: "Divide el intervalo a la mitad en cada paso. Siempre converge si f(a) y f(b) tienen signos opuestos. Lento pero muy robusto.",
    orden: "Lineal (p ≈ 1)",
    pros: "Garantiza convergencia",
    cons: "Requiere intervalo con cambio de signo, converge lento",
  },
  {
    value: "newton",
    label: "Newton-Raphson",
    color: "#10b981",
    desc: "Usa la derivada para encontrar la raíz más rápido. Converge cuadráticamente cerca de la raíz. Puede fallar si la derivada es cero o la estimación inicial es mala.",
    orden: "Cuadrático (p ≈ 2)",
    pros: "Muy rápido cerca de la raíz",
    cons: "Necesita derivada, sensible al punto inicial",
  },
  {
    value: "secante",
    label: "Secante",
    color: "#3b82f6",
    desc: "Similar a Newton pero sin necesitar la derivada — la aproxima con dos puntos. Convergencia superlineal. Buen balance entre velocidad y simplicidad.",
    orden: "Superlineal (p ≈ 1.618)",
    pros: "No necesita derivada, más rápido que bisección",
    cons: "Puede divergir con malos puntos iniciales",
  },
];

const PARAM_INFO: Record<string, { label: string; desc: string; unit: string; default: string }> = {
  ingreso_mensual:  { label: "Ingreso mensual familiar", desc: "Total de ingresos de la familia por mes", unit: "Bs/mes", default: "3000" },
  ahorro_inicial:   { label: "Ahorros disponibles", desc: "Dinero ahorrado que puede usar la familia", unit: "Bs", default: "1500" },
  costo_base:       { label: "Costo diario de la canasta", desc: "Cuánto gasta la familia por día en alimentos básicos al inicio", unit: "Bs/día", default: "80" },
  tasa_inflacion:   { label: "Tasa de inflación diaria", desc: "Cuánto sube el costo cada día (0.03 = 3% diario)", unit: "decimal", default: "0.03" },
  consumo_diario:   { label: "Consumo diario de carburante", desc: "Litros que consume La Paz por día normalmente", unit: "litros/día", default: "5000" },
  reserva_actual:   { label: "Reserva actual de carburante", desc: "Litros disponibles en los depósitos al inicio del bloqueo", unit: "litros", default: "40000" },
  dias_bloqueo:     { label: "Días de bloqueo estimados", desc: "Cuántos días se espera que dure el bloqueo", unit: "días", default: "10" },
  poblacion:        { label: "Población de referencia", desc: "Total de personas en el área de análisis", unit: "personas", default: "100000" },
  tasa_contagio:    { label: "Tasa de contagio social", desc: "Qué tan rápido se propaga la movilización (0.15 = 15%)", unit: "decimal", default: "0.15" },
  umbral_critico:   { label: "Umbral crítico de masificación", desc: "Fracción de la población que define masificación (0.3 = 30%)", unit: "fracción", default: "0.3" },
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function EscenarioE() {
  const [selectedModel, setSelectedModel] = useState("costo");
  const [selectedMethod, setSelectedMethod] = useState("biseccion");
  const [params, setParams] = useState<Record<string, string>>({
    ingreso_mensual: "3000", ahorro_inicial: "1500", costo_base: "80", tasa_inflacion: "0.03",
    consumo_diario: "5000", reserva_actual: "40000", dias_bloqueo: "10",
    poblacion: "100000", tasa_contagio: "0.15", umbral_critico: "0.3",
    a: "1", b: "60", x0: "20", tol: "0.000001", max_iter: "100",
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllIter, setShowAllIter] = useState(false);

  const modelInfo  = MODELS.find((m) => m.value === selectedModel)!;
  const methodInfo = METHODS.find((m) => m.value === selectedMethod)!;

  function setParam(key: string, val: string) {
    setParams((p) => ({ ...p, [key]: val }));
  }

  // Actualiza defaults de a/b/x0 al cambiar modelo
  function handleModelChange(model: string) {
    setSelectedModel(model);
    const defaults: Record<string, Record<string, string>> = {
      costo:      { a: "1",  b: "60",     x0: "20" },
      carburante: { a: "0",  b: "5000",   x0: "2500" },
      social:     { a: "0",  b: "100000", x0: "30000" },
    };
    setParams((p) => ({ ...p, ...defaults[model] }));
    setResult(null);
  }

  async function handleSolve() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload: Record<string, any> = {
        model: selectedModel,
        method: selectedMethod,
        tol: parseFloat(params.tol) || 1e-6,
        max_iter: parseInt(params.max_iter) || 100,
        a: parseFloat(params.a),
        b: parseFloat(params.b),
        x0: parseFloat(params.x0),
      };
      // Parámetros del modelo
      Object.keys(PARAM_INFO).forEach((k) => {
        if (params[k] !== undefined) payload[k] = parseFloat(params[k]);
      });
      const res = await api.post("/api/scenario-e/solve", payload);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
        setShowAllIter(false);
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
    const raiz = result.raiz;
    const comp = result.comparacion;

    const mensajes: Record<string, ReactNode> = {
      costo: (
        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
          <p>
            📅 Con los parámetros ingresados, la familia agota su capacidad de compra
            aproximadamente el <strong className="text-red-400">día {Math.round(raiz)}</strong> del mes.
            A partir de ese día, el gasto acumulado supera los ingresos más los ahorros disponibles.
          </p>
          <p>
            Esto significa que si el bloqueo dura más de{" "}
            <strong className="text-white">{Math.round(raiz)} días</strong>, la familia entra en
            situación de insolvencia alimentaria — no puede costear la canasta básica con sus propios recursos.
          </p>
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
            💡 <strong className="text-gray-200">Interpretación matemática:</strong> La función f(x) = ingresos_acumulados(x) − gasto_acumulado(x)
            es positiva cuando la familia puede pagar, y negativa cuando no puede. La raíz es el punto de quiebre exacto.
          </div>
        </div>
      ),
      carburante: (
        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
          <p>
            ⛽ La tasa mínima de reposición para que las reservas no lleguen a cero es de{" "}
            <strong className="text-blue-400">{raiz.toLocaleString()} litros/día</strong>.
          </p>
          <p>
            Si la reposición real es <strong className="text-red-400">menor a este valor</strong>,
            las reservas se agotan antes de que termine el bloqueo.
            Si es <strong className="text-green-400">mayor</strong>, el sistema logístico es sostenible.
          </p>
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
            💡 <strong className="text-gray-200">Interpretación:</strong> f(r) = Reserva − (Consumo − r) × Días.
            La raíz r* es la tasa exacta donde el balance es cero — el punto logístico crítico.
          </div>
        </div>
      ),
      social: (
        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
          <p>
            📢 El umbral de masificación social se alcanza cuando{" "}
            <strong className="text-purple-400">{Math.round(raiz).toLocaleString()} personas</strong> están movilizadas.
          </p>
          <p>
            Por debajo de ese número, el movimiento tiende a disolverse.
            Por encima, la dinámica social se vuelve autosostenible y se masifica rápidamente.
          </p>
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
            💡 <strong className="text-gray-200">Modelo logístico:</strong> f(x) = r·x·(1 − x/N) − umbral·N.
            La raíz es el punto donde la tasa de crecimiento de la movilización iguala exactamente el umbral crítico.
          </div>
        </div>
      ),
    };

    // Comparación de métodos
    const metodosOrdenados = Object.entries(comp)
      .filter(([, v]: any) => !v.error)
      .sort(([, a]: any, [, b]: any) => a.iteraciones - b.iteraciones);

    return (
      <div className="space-y-5">
        {mensajes[result.model]}

        {/* Comparación de métodos */}
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">
            🔬 Comparación de los 3 métodos para este problema:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METHODS.map((m) => {
              const c = comp[m.value];
              const isSelected = m.value === selectedMethod;
              if (c?.error) return (
                <div key={m.value} className="bg-gray-900 rounded-xl p-3 border border-red-800">
                  <p className="text-xs font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
                  <p className="text-xs text-red-400">⚠️ {c.error}</p>
                </div>
              );
              return (
                <div key={m.value}
                  className={`rounded-xl p-3 border ${isSelected ? "border-white/30 bg-gray-700" : "border-gray-700 bg-gray-900"}`}>
                  <p className="text-xs font-semibold mb-2" style={{ color: m.color }}>{m.label}</p>
                  <div className="space-y-1 text-xs text-gray-300">
                    <p>Raíz: <strong className="text-white">{c.raiz}</strong></p>
                    <p>Iteraciones: <strong className="text-white">{c.iteraciones}</strong></p>
                    <p>Error final: <strong className="text-white">{c.error_final?.toExponential(2)}</strong></p>
                    <p>Orden p ≈ <strong className="text-white">{c.orden_convergencia ?? "—"}</strong></p>
                  </div>
                  {isSelected && <p className="text-xs text-gray-500 mt-2">← método seleccionado</p>}
                </div>
              );
            })}
          </div>
          {metodosOrdenados.length > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              🏆 <strong className="text-gray-300">Método más rápido:</strong>{" "}
              {METHODS.find((m) => m.value === (metodosOrdenados[0][0]))?.label} con{" "}
              {(metodosOrdenados[0][1] as any).iteraciones} iteraciones.
              {" "}
              {selectedMethod === "biseccion"
                ? "Bisección es el más lento pero el más seguro — siempre converge si el intervalo es correcto."
                : selectedMethod === "newton"
                ? "Newton-Raphson es el más rápido gracias a su convergencia cuadrática."
                : "La secante ofrece buen balance: más rápida que bisección sin necesitar derivada."}
            </p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400">
          <strong className="text-gray-200">Orden de convergencia estimado (método seleccionado):</strong>{" "}
          {result.orden_convergencia
            ? `p ≈ ${result.orden_convergencia} — ${
                result.orden_convergencia < 1.2 ? "convergencia lineal (lenta)" :
                result.orden_convergencia < 1.8 ? "convergencia superlineal" :
                "convergencia cuadrática (muy rápida)"
              }`
            : "No se pudo estimar (pocas iteraciones)."}
          <br />
          <strong className="text-gray-200">Convergió en:</strong> {result.iteraciones_count} iteraciones.
          <strong className="text-gray-200"> f(raíz) =</strong> {result.f_raiz} (idealmente ≈ 0).
        </div>
      </div>
    );
  }

  // ── Datos para gráfico ───────────────────────────────────────────────────

  const chartData = result
    ? result.curva_x.map((x: number, i: number) => ({
        x: parseFloat(x.toFixed(2)),
        "f(x)": result.curva_y[i],
      }))
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold bg-red-700 text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Escenario E · Raíces de Ecuaciones
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Umbrales Críticos de Abastecimiento
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          En una crisis de bloqueos, existen <strong className="text-white">puntos de quiebre exactos</strong>:
          el día en que la familia no puede comprar más, el nivel mínimo de carburante que debe llegar,
          o el número de personas que desencadena una masificación social. Estos puntos son las{" "}
          <strong className="text-white">raíces de funciones no lineales</strong> — los valores donde
          el sistema pasa de estable a colapso.
        </p>
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 max-w-2xl">
          <p className="text-xs text-gray-400">
            <strong className="text-white">¿Qué es una raíz?</strong>{" "}
            Es el valor de x donde f(x) = 0. En nuestro caso, f(x) representa un balance:
            ingresos menos gastos, reservas menos consumo, o crecimiento social menos umbral.
            Cuando f(x) = 0, el sistema está en el límite exacto entre estabilidad y colapso.
          </p>
        </div>
      </div>

      {/* Sección 1: Modelo */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">1. Selecciona el escenario de crisis</h2>
        <p className="text-xs text-gray-500 mb-5">
          Cada escenario plantea una función diferente cuya raíz representa un umbral crítico real.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODELS.map((m) => (
            <button key={m.value} onClick={() => handleModelChange(m.value)}
              className={`text-left p-4 rounded-xl border-2 transition ${
                selectedModel === m.value ? "bg-gray-800" : "border-gray-700 hover:border-gray-500"
              }`}
              style={{ borderColor: selectedModel === m.value ? m.color : undefined }}>
              <p className="text-sm font-semibold mb-2" style={{ color: m.color }}>{m.label}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sección 2: Parámetros del modelo */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">2. Parámetros del modelo</h2>
        <p className="text-xs text-gray-500 mb-5">
          Ajusta los valores que definen la situación de crisis. Los valores por defecto representan
          un escenario realista para La Paz durante un bloqueo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modelInfo.params.map((key) => {
            const info = PARAM_INFO[key];
            return (
              <div key={key}>
                <label className="text-xs font-medium text-gray-300 block mb-1">
                  {info.label}
                  <span className="text-gray-500 font-normal ml-1">({info.unit})</span>
                </label>
                <p className="text-xs text-gray-600 mb-1.5">{info.desc}</p>
                <input
                  type="number" step="any"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-red-500 focus:outline-none"
                  value={params[key] ?? info.default}
                  onChange={(e) => setParam(key, e.target.value)}
                  placeholder={info.default}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección 3: Método */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">3. Método numérico</h2>
        <p className="text-xs text-gray-500 mb-5">
          Elige cómo se buscará la raíz. El resultado mostrará también la comparación entre los 3 métodos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {METHODS.map((m) => (
            <button key={m.value} onClick={() => setSelectedMethod(m.value)}
              className={`text-left p-4 rounded-xl border-2 transition ${
                selectedMethod === m.value ? "bg-gray-800" : "border-gray-700 hover:border-gray-500"
              }`}
              style={{ borderColor: selectedMethod === m.value ? m.color : undefined }}>
              <p className="text-sm font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
              <p className="text-xs text-gray-400 mb-2">{m.desc}</p>
              <div className="text-xs space-y-0.5">
                <p className="text-gray-500">Orden: <span className="text-gray-300">{m.orden}</span></p>
                <p className="text-green-700">✓ {m.pros}</p>
                <p className="text-red-800">✗ {m.cons}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Parámetros numéricos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-800 pt-5">
          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              {modelInfo.a_label}
              <span className="text-gray-500 font-normal ml-1">({modelInfo.x_unit})</span>
            </label>
            <p className="text-xs text-gray-600 mb-1.5">
              {selectedMethod === "biseccion"
                ? "Extremo izquierdo del intervalo — f(a) debe tener signo opuesto a f(b)"
                : selectedMethod === "secante"
                ? "Primer punto inicial para la secante"
                : "No se usa en Newton-Raphson (se ignora)"}
            </p>
            <input type="number" step="any"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-red-500 focus:outline-none"
              value={params.a} onChange={(e) => setParam("a", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              {modelInfo.b_label}
              <span className="text-gray-500 font-normal ml-1">({modelInfo.x_unit})</span>
            </label>
            <p className="text-xs text-gray-600 mb-1.5">
              {selectedMethod === "biseccion"
                ? "Extremo derecho del intervalo — f(b) debe tener signo opuesto a f(a)"
                : selectedMethod === "secante"
                ? "Segundo punto inicial para la secante"
                : "No se usa en Newton-Raphson (se ignora)"}
            </p>
            <input type="number" step="any"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-red-500 focus:outline-none"
              value={params.b} onChange={(e) => setParam("b", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              {modelInfo.x0_label}
              <span className="text-gray-500 font-normal ml-1">({modelInfo.x_unit})</span>
            </label>
            <p className="text-xs text-gray-600 mb-1.5">
              {selectedMethod === "newton"
                ? "Punto de partida para Newton-Raphson — cuanto más cerca de la raíz, más rápido converge"
                : selectedMethod === "secante"
                ? "Primer punto inicial (x0) para la secante"
                : "No se usa en bisección (se ignora)"}
            </p>
            <input type="number" step="any"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-red-500 focus:outline-none"
              value={params.x0} onChange={(e) => setParam("x0", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1">
              Tolerancia (error máximo aceptable)
            </label>
            <p className="text-xs text-gray-600 mb-1.5">
              El algoritmo se detiene cuando el error es menor a este valor. 0.000001 es suficiente para la mayoría de casos.
            </p>
            <input type="number" step="any"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:border-red-500 focus:outline-none"
              value={params.tol} onChange={(e) => setParam("tol", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Botón */}
      <button onClick={handleSolve} disabled={loading}
        className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition mb-8">
        {loading ? "Buscando umbral crítico..." : "▶ Encontrar umbral de colapso"}
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {result && (
        <>
          {/* KPI principal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-red-900 rounded-2xl p-5 text-center sm:col-span-1">
              <p className="text-xs text-gray-500 mb-1">🎯 Umbral crítico encontrado</p>
              <p className="text-3xl font-bold text-red-400">
                {result.raiz.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{modelInfo.x_unit}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">Iteraciones necesarias</p>
              <p className="text-3xl font-bold text-white">{result.iteraciones_count}</p>
              <p className="text-xs text-gray-500 mt-1">{methodInfo.label}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">Orden de convergencia</p>
              <p className="text-3xl font-bold text-white">
                {result.orden_convergencia ? `p ≈ ${result.orden_convergencia}` : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">f(raíz) = {result.f_raiz}</p>
            </div>
          </div>

          {/* Gráfico de la función */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Gráfico de la función f(x)</h2>
            <p className="text-xs text-gray-500 mb-4">
              La curva muestra el valor de la función en cada punto.
              La <strong className="text-red-400">línea roja vertical</strong> marca la raíz encontrada —
              el punto exacto donde f(x) = 0 y el sistema está en el límite crítico.
              A la izquierda de la raíz el sistema es estable; a la derecha, colapsa.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="x" stroke="#9ca3af" tick={{ fontSize: 10 }}
                  label={{ value: result.x_label, position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }}
                  label={{ value: result.y_label, angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: any) => [val?.toFixed ? val.toFixed(4) : val]}
                  labelFormatter={(l) => `x = ${l}`}
                />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
                <ReferenceLine x={parseFloat(result.raiz.toFixed(2))}
                  stroke="#ef4444" strokeWidth={2}
                  label={{ value: `Raíz: ${result.raiz.toFixed(3)}`, fill: "#ef4444", fontSize: 11, position: "top" }} />
                <Line type="monotone" dataKey="f(x)" stroke={modelInfo.color}
                  strokeWidth={2} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de iteraciones */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">Tabla de iteraciones</h2>
              <button onClick={() => setShowAllIter(!showAllIter)}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition">
                {showAllIter ? "Mostrar menos" : `Ver todas (${result.iteraciones.length})`}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Cada fila muestra un paso del algoritmo. El <strong className="text-gray-300">error</strong> debe
              disminuir en cada iteración — así se verifica que el método está convergiendo hacia la raíz.
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {result.iteraciones.length > 0 &&
                      Object.keys(result.iteraciones[0]).map((k) => (
                        <th key={k} className="px-3 py-2 text-left text-gray-400 font-medium">{k}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {(showAllIter ? result.iteraciones : result.iteraciones.slice(0, 10)).map((it: any, i: number) => (
                    <tr key={i} className={`border-t border-gray-800/50 ${i === result.iteraciones.length - 1 ? "bg-red-950/30" : "hover:bg-gray-800/30"}`}>
                      {Object.values(it).map((v: any, j: number) => (
                        <td key={j} className="px-3 py-1.5 font-mono text-gray-300">
                          {typeof v === "number" ? (Math.abs(v) < 0.001 && v !== 0 ? v.toExponential(3) : v.toFixed ? v.toFixed(6) : v) : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAllIter && result.iteraciones.length > 10 && (
              <p className="text-xs text-gray-600 mt-2 text-center">
                Mostrando 10 de {result.iteraciones.length} iteraciones.
              </p>
            )}
          </div>

          {/* Conclusión */}
          <div className="bg-red-950/30 border border-red-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-red-300">📊 Análisis del umbral crítico</h2>
            {getConclusion()}
          </div>
        </>
      )}
    </main>
  );
}