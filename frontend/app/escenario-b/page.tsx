"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const METHODS = [
  { value: "euler", label: "Euler", color: "#f59e0b", desc: "Método más simple. Usa solo el valor actual para predecir el siguiente. Rápido pero menos preciso." },
  { value: "heun", label: "Heun (Euler mejorado)", color: "#10b981", desc: "Mejora a Euler haciendo una predicción y luego corrigiéndola. Más preciso con poco esfuerzo extra." },
  { value: "rk4", label: "Runge-Kutta 4 (RK4)", color: "#3b82f6", desc: "El más preciso de los tres. Evalúa la tendencia 4 veces por paso para minimizar el error." },
];

const DEFAULTS = {
  R0: 500,
  entrada: 80,
  consumo: 100,
  consumo_extra: 30,
  dias: 30,
  nivel_critico: 50,
  h: 1.0,
};

export default function EscenarioB() {
  const [method, setMethod] = useState("rk4");
  const [params, setParams] = useState(DEFAULTS);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllMethods, setShowAllMethods] = useState(true);

  function setParam(key: string, val: number) {
    setParams((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSolve() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/api/scenario-b/solve", {
        method,
        ...params,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  // Merge all methods into one chart dataset
  function buildChartData() {
    if (!result) return [];
    const euler = result.all_methods.euler;
    const heun = result.all_methods.heun;
    const rk4 = result.all_methods.rk4;
    return euler.map((pt: any, i: number) => ({
      dia: pt.dia,
      Euler: euler[i]?.reserva,
      Heun: heun[i]?.reserva,
      RK4: rk4[i]?.reserva,
    }));
  }

  function getConclusion() {
    if (!result) return null;
    const { critical_days, net_rate, final_reserve, nivel_critico, dias_simulados } = result;
    const selectedLabel = METHODS.find((m) => m.value === method)?.label;
    const critDay = critical_days[method];
    const netStr = net_rate >= 0
      ? `+${net_rate} cisternas/día (la reserva CRECE)`
      : `${net_rate} cisternas/día (la reserva SE AGOTA)`;

    return (
      <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
        <p>
          🔋 <strong className="text-white">Situación inicial:</strong> La planta comienza con{" "}
          <strong className="text-white">{params.R0} cisternas</strong> de combustible disponibles.
          El balance neto diario es <strong className={net_rate >= 0 ? "text-green-400" : "text-red-400"}>{netStr}</strong>.
        </p>

        {critDay !== null ? (
          <div className="bg-red-950/50 border border-red-700 rounded-xl px-4 py-3">
            <p className="text-red-300">
              🚨 <strong>Alerta crítica:</strong> Con el método <strong>{selectedLabel}</strong>, la reserva llega al nivel crítico
              de <strong>{nivel_critico} cisternas</strong> en el <strong>día {critDay}</strong>.
              Esto significa que en {critDay} días, la planta entraría en estado de emergencia y no podría abastecer normalmente.
            </p>
          </div>
        ) : (
          <div className="bg-green-950/50 border border-green-700 rounded-xl px-4 py-3">
            <p className="text-green-300">
              ✅ <strong>Sistema estable:</strong> Con el método <strong>{selectedLabel}</strong>, la reserva NO llega al nivel crítico
              en los {dias_simulados} días simulados. La reserva final es de <strong>{final_reserve} cisternas</strong>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {METHODS.map((m) => {
            const cd = critical_days[m.value];
            return (
              <div key={m.value} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <p className="text-xs font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
                {cd !== null
                  ? <p className="text-xs text-red-300">⚠️ Nivel crítico: día <strong>{cd}</strong></p>
                  : <p className="text-xs text-green-300">✅ No llega al nivel crítico</p>
                }
              </div>
            );
          })}
        </div>

        <p>
          📊 <strong className="text-white">Comparación de métodos:</strong> Los tres métodos (Euler, Heun y RK4) deberían dar resultados
          muy similares para este modelo. Si ves diferencias grandes entre ellos, significa que el paso de tiempo (h) es demasiado grande
          y el método Euler está acumulando error. RK4 siempre es el más preciso.
        </p>

        <p>
          💡 <strong className="text-white">¿Qué hacer?</strong>{" "}
          {net_rate < 0
            ? `Para evitar el desabastecimiento, se necesita aumentar la entrada diaria en al menos ${Math.abs(net_rate)} cisternas/día, o reducir el consumo extra por pánico.`
            : `El sistema es sostenible con la configuración actual. Si aumentas el consumo extra (simulando un bloqueo), observa cómo cambia el día crítico.`
          }
        </p>
      </div>
    );
  }

  const chartData = buildChartData();
  const selectedMethodInfo = METHODS.find((m) => m.value === method);

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold bg-orange-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Escenario B · Ecuaciones Diferenciales Ordinarias
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Vaciado Crítico de Reservas de Carburantes
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Durante los bloqueos en Bolivia, las plantas de combustible como Senkata dejan de recibir
          abastecimiento mientras el consumo aumenta por pánico. Este simulador modela cómo evoluciona
          la reserva de combustible día a día usando ecuaciones diferenciales, y predice cuándo se
          llegará a un nivel crítico de desabastecimiento.
        </p>
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 max-w-2xl">
          <p className="text-xs text-gray-400">
            <strong className="text-white">¿Qué es una ecuación diferencial aquí?</strong>{" "}
            Es una fórmula que describe cómo cambia la reserva cada día:{" "}
            <code className="bg-gray-800 px-2 py-0.5 rounded text-orange-300">
              Cambio diario = Entrada − Consumo total
            </code>{" "}
            Si entra menos de lo que se consume, la reserva baja. Los métodos numéricos calculan esto
            paso a paso, día por día.
          </p>
        </div>
      </div>

      {/* Parámetros */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">1. Estado inicial de la planta</h2>
        <p className="text-xs text-gray-500 mb-5">
          Define cuánto combustible tiene la planta hoy y cuánto entra y sale cada día.
          Todos los valores están en <strong className="text-gray-300">cisternas de combustible</strong>.
          Una cisterna equivale aproximadamente a 10,000 litros.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">
              🔋 Reserva inicial (cisternas)
            </label>
            <input type="number" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
              value={params.R0} onChange={(e) => setParam("R0", parseFloat(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">
              Cuántas cisternas tiene la planta hoy. Ejemplo: 500 cisternas = reserva para varios días.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">
              📥 Abastecimiento diario (cisternas/día)
            </label>
            <input type="number" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
              value={params.entrada} onChange={(e) => setParam("entrada", parseFloat(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">
              Cuántas cisternas llegan a la planta cada día en condiciones normales. Durante un bloqueo, este número baja o llega a 0.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">
              📤 Consumo normal (cisternas/día)
            </label>
            <input type="number" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
              value={params.consumo} onChange={(e) => setParam("consumo", parseFloat(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">
              Cuántas cisternas se despachan normalmente cada día para abastecer a la ciudad.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">
              🔥 Consumo extra por bloqueo/pánico (cisternas/día)
            </label>
            <input type="number" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
              value={params.consumo_extra} onChange={(e) => setParam("consumo_extra", parseFloat(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">
              Cuando hay bloqueo, la gente compra más combustible por miedo. Este valor simula ese consumo adicional.
              Ponlo en 0 para ver el escenario sin bloqueo.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">
              🚨 Nivel crítico de alerta (cisternas)
            </label>
            <input type="number" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
              value={params.nivel_critico} onChange={(e) => setParam("nivel_critico", parseFloat(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">
              Cuando la reserva baja de este número, la planta entra en emergencia. Por debajo de este nivel, no puede abastecer normalmente.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-300 font-medium block mb-1">
              📅 Días a simular
            </label>
            <input type="number" min={5} max={90} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
              value={params.dias} onChange={(e) => setParam("dias", parseInt(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">
              Cuántos días hacia el futuro quieres proyectar la situación.
            </p>
          </div>
        </div>
      </div>

      {/* Paso de tiempo */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">2. Precisión del cálculo</h2>
        <p className="text-xs text-gray-500 mb-5">
          Define qué tan "fino" es el cálculo. Un paso más pequeño = más preciso pero más lento.
        </p>
        <div className="max-w-xs">
          <label className="text-xs text-gray-300 font-medium block mb-1">
            ⏱ Paso de tiempo h (días)
          </label>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full"
            value={params.h} onChange={(e) => setParam("h", parseFloat(e.target.value))}>
            <option value={1.0}>1 día (estándar)</option>
            <option value={0.5}>0.5 días (más preciso)</option>
            <option value={0.25}>0.25 días (muy preciso)</option>
          </select>
          <p className="text-xs text-gray-600 mt-1">
            Con h=1, el cálculo avanza de día en día. Con h=0.5, avanza cada medio día y es más preciso.
            Cambia este valor y observa si los métodos dan resultados diferentes.
          </p>
        </div>
      </div>

      {/* Método */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-1">3. Método numérico a usar</h2>
        <p className="text-xs text-gray-500 mb-5">
          Elige cómo la computadora calculará la evolución de la reserva día a día.
          El gráfico siempre mostrará los tres métodos para que puedas comparar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={`text-left p-4 rounded-xl border-2 transition ${
                method === m.value
                  ? "border-opacity-100 bg-gray-800"
                  : "border-gray-700 hover:border-gray-500"
              }`}
              style={{ borderColor: method === m.value ? m.color : undefined }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
              <p className="text-xs text-gray-400">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button
        onClick={handleSolve}
        disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition mb-8"
      >
        {loading ? "Simulando..." : "▶ Simular evolución de reservas"}
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Reserva inicial</p>
              <p className="text-2xl font-bold text-white">{result.initial_reserve}</p>
              <p className="text-xs text-gray-600">cisternas</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Reserva final (día {result.dias_simulados})</p>
              <p className={`text-2xl font-bold ${result.final_reserve <= result.nivel_critico ? "text-red-400" : "text-green-400"}`}>
                {result.final_reserve}
              </p>
              <p className="text-xs text-gray-600">cisternas</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Balance neto diario</p>
              <p className={`text-2xl font-bold ${result.net_rate >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.net_rate > 0 ? "+" : ""}{result.net_rate}
              </p>
              <p className="text-xs text-gray-600">cisternas/día</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Día crítico ({METHODS.find(m=>m.value===method)?.label})</p>
              <p className={`text-2xl font-bold ${result.critical_days[method] !== null ? "text-red-400" : "text-green-400"}`}>
                {result.critical_days[method] !== null ? `Día ${result.critical_days[method]}` : "No crítico"}
              </p>
              <p className="text-xs text-gray-600">nivel &lt; {result.nivel_critico} cisternas</p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Evolución de la reserva de combustible</h2>
            <p className="text-xs text-gray-500 mb-4">
              Cada línea muestra cómo evoluciona la reserva según el método. La línea roja punteada es el nivel crítico de alerta.
              Si una línea la cruza, la planta entraría en emergencia ese día.
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="dia" stroke="#9ca3af" tick={{ fontSize: 11 }}
                  label={{ value: "Días", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                  label={{ value: "Cisternas", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val} cisternas`]}
                  labelFormatter={(l) => `Día ${l}`}
                />
                <Legend />
                <ReferenceLine y={result.nivel_critico} stroke="#ef4444" strokeDasharray="6 3"
                  label={{ value: `Nivel crítico (${result.nivel_critico})`, fill: "#ef4444", fontSize: 10 }} />
                {showAllMethods ? (
                  <>
                    <Line type="monotone" dataKey="Euler" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Heun" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="RK4" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </>
                ) : (
                  <Line type="monotone" dataKey={METHODS.find(m=>m.value===method)?.label.split(" ")[0]}
                    stroke={selectedMethodInfo?.color} strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex items-center gap-2">
              <input type="checkbox" id="showAll" checked={showAllMethods}
                onChange={(e) => setShowAllMethods(e.target.checked)}
                className="accent-orange-500" />
              <label htmlFor="showAll" className="text-xs text-gray-400">
                Mostrar los 3 métodos simultáneamente para comparar
              </label>
            </div>
          </div>

          {/* Tabla de datos */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-1">Tabla de evolución diaria</h2>
            <p className="text-xs text-gray-500 mb-4">
              Muestra la reserva exacta en cada día según el método seleccionado. Las filas en rojo indican días por debajo del nivel crítico.
            </p>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="text-xs w-full">
                <thead className="sticky top-0 bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400">Día</th>
                    <th className="px-3 py-2 text-center text-orange-400">Euler</th>
                    <th className="px-3 py-2 text-center text-green-400">Heun</th>
                    <th className="px-3 py-2 text-center text-blue-400">RK4</th>
                  </tr>
                </thead>
                <tbody>
                  {result.all_methods.euler.map((pt: any, i: number) => {
                    const eulerVal = result.all_methods.euler[i]?.reserva;
                    const heunVal = result.all_methods.heun[i]?.reserva;
                    const rk4Val = result.all_methods.rk4[i]?.reserva;
                    const isCritical = eulerVal <= result.nivel_critico || heunVal <= result.nivel_critico || rk4Val <= result.nivel_critico;
                    return (
                      <tr key={i} className={`border-t border-gray-800 ${isCritical ? "bg-red-950/30" : "hover:bg-gray-800/50"}`}>
                        <td className="px-3 py-2 text-gray-400">Día {pt.dia}</td>
                        <td className={`px-3 py-2 text-center ${eulerVal <= result.nivel_critico ? "text-red-400 font-bold" : ""}`}>{eulerVal}</td>
                        <td className={`px-3 py-2 text-center ${heunVal <= result.nivel_critico ? "text-red-400 font-bold" : ""}`}>{heunVal}</td>
                        <td className={`px-3 py-2 text-center ${rk4Val <= result.nivel_critico ? "text-red-400 font-bold" : ""}`}>{rk4Val}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusión */}
          <div className="bg-orange-950/30 border border-orange-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-orange-300">📊 Conclusión e interpretación</h2>
            <div className="text-sm text-gray-300 leading-relaxed">{getConclusion()}</div>
          </div>
        </>
      )}
    </main>
  );
}