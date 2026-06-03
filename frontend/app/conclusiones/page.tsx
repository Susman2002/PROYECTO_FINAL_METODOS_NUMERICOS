"use client";
import Link from "next/link";
import { useState } from "react";

const ESCENARIOS = [
  {
    id: "A",
    color: "blue",
    titulo: "Escenario A — Optimización del Abastecimiento",
    metodo: "Jacobi · Gauss-Seidel · SOR · LU · Gradiente Conjugado",
    icono: "🏭",
    aprendido:
      "Aprendimos a modelar redes de distribución como sistemas de ecuaciones lineales Ax = b, donde cada ecuación representa el balance entre oferta y demanda de una zona. Comprendimos que la elección del método iterativo (Jacobi, Gauss-Seidel, SOR) afecta directamente la velocidad de convergencia.",
    masUtil:
      "El método SOR (Sobre-Relajación Sucesiva) fue el más eficiente: al ajustar el factor ω, converge más rápido que Jacobi y Gauss-Seidel. La Descomposición LU fue la más exacta para sistemas pequeños al dar la solución directa sin iteraciones.",
    limitaciones:
      "El modelo asume que la red de distribución es estática y que la demanda es conocida con exactitud. En la realidad, los bloqueos cambian la topología de la red dinámicamente y la demanda varía hora a hora. Además, el modelo no considera costos de transporte ni capacidades máximas de rutas.",
    mejoras:
      "Incorporar restricciones de capacidad por ruta, modelar bloqueos como eliminación de filas/columnas en A, y usar programación lineal para optimizar costos además de cantidades. También sería útil actualizar la matriz A en tiempo real con datos de tráfico.",
  },
  {
    id: "B",
    color: "yellow",
    titulo: "Escenario B — Vaciado de Reservas de Combustible",
    metodo: "Euler · Heun · Runge-Kutta 4",
    icono: "⛽",
    aprendido:
      "Aprendimos a modelar la dinámica de reservas de combustible como una EDO: dR/dt = entrada − consumo. Comprendimos la diferencia entre métodos explícitos de un paso (Euler) y métodos de mayor orden (Heun, RK4), y cómo el tamaño del paso h afecta la precisión y estabilidad de la solución.",
    masUtil:
      "Runge-Kutta de orden 4 fue el método más útil: con el mismo paso h que Euler, produce resultados significativamente más precisos. Heun ofreció un buen balance entre simplicidad y precisión como método predictor-corrector de orden 2.",
    limitaciones:
      "El modelo usa una tasa de consumo constante, cuando en realidad el consumo de combustible varía según el día de la semana, la temporada y los bloqueos. Tampoco considera el efecto de precios sobre la demanda ni la posibilidad de importaciones de emergencia.",
    mejoras:
      "Usar una función de consumo variable c(t) que refleje patrones reales, incorporar eventos discretos (bloqueos, importaciones) como discontinuidades en la EDO, y calibrar el modelo con datos históricos del YPFB.",
  },
  {
    id: "C",
    color: "green",
    titulo: "Escenario C — Precios de Alimentos",
    metodo: "Lagrange · Newton (Diferencias Divididas) · Splines Cúbicos",
    icono: "🥬",
    aprendido:
      "Aprendimos a reconstruir curvas de precios a partir de datos escasos usando interpolación polinomial. Comprendimos el fenómeno de Runge (oscilaciones en los extremos con polinomios de alto grado) y por qué los Splines Cúbicos son preferibles cuando se tienen muchos puntos de datos.",
    masUtil:
      "Los Splines Cúbicos fueron los más útiles: producen curvas suaves y realistas sin oscilaciones artificiales, lo que es esencial para estimar precios en días sin registro. Newton con diferencias divididas fue el más eficiente computacionalmente para agregar nuevos puntos sin recalcular todo.",
    limitaciones:
      "La interpolación solo es válida dentro del rango de datos conocidos (no extrapola bien). El modelo no captura shocks de precios abruptos (como un bloqueo repentino) ni la estacionalidad. Con pocos puntos de datos, cualquier método puede dar estimaciones poco confiables.",
    mejoras:
      "Combinar interpolación con regresión para suavizar datos ruidosos, incorporar variables externas (precio del dólar, costo de transporte) como covariables, y usar series de tiempo para capturar tendencias y estacionalidad.",
  },
  {
    id: "D",
    color: "purple",
    titulo: "Escenario D — Poder Adquisitivo Familiar",
    metodo: "Bisección · Newton-Raphson · Secante",
    icono: "👨‍👩‍👧",
    aprendido:
      "Aprendimos a encontrar el punto de equilibrio donde el ingreso familiar iguala al costo de la canasta básica, formulándolo como f(x) = 0. Comprendimos las diferencias entre métodos de búsqueda de raíces: Bisección garantiza convergencia pero es lento; Newton-Raphson converge rápido pero requiere derivada; Secante es un compromiso entre ambos.",
    masUtil:
      "Newton-Raphson fue el más útil por su convergencia cuadrática: en pocos pasos encuentra el umbral crítico de ingreso. Sin embargo, Bisección fue el más confiable cuando la función tenía comportamiento irregular, ya que siempre converge si existe la raíz.",
    limitaciones:
      "El modelo asume una función de costo de canasta básica continua y diferenciable, cuando en realidad los precios cambian de forma discreta. Tampoco considera ingresos variables, deudas familiares ni acceso diferenciado a subsidios según zona geográfica.",
    mejoras:
      "Modelar la canasta básica con datos reales del INE Bolivia, incorporar distribuciones de probabilidad para el ingreso familiar, y extender el análisis a diferentes estratos socioeconómicos de La Paz.",
  },
  {
    id: "E",
    color: "teal",
    titulo: "Escenario E — Umbrales Críticos de Abastecimiento",
    metodo: "Bisección · Newton-Raphson · Secante",
    icono: "⚠️",
    aprendido:
      "Aprendimos a identificar umbrales críticos en sistemas de abastecimiento como raíces de ecuaciones no lineales. Comprendimos que el punto donde el stock cae a nivel crítico puede modelarse matemáticamente y calcularse con precisión usando métodos numéricos, lo que permite anticipar crisis antes de que ocurran.",
    masUtil:
      "El método de la Secante fue el más útil en este escenario: no requiere derivada analítica (útil cuando el modelo de consumo es complejo) y converge más rápido que Bisección. Newton-Raphson fue el más preciso cuando la función de stock era diferenciable.",
    limitaciones:
      "El modelo define un único umbral crítico fijo, cuando en la realidad el nivel crítico depende del tiempo de reposición, que varía con los bloqueos. Tampoco modela la distribución geográfica del stock ni las diferencias entre productos esenciales.",
    mejoras:
      "Definir umbrales dinámicos que dependan del tiempo estimado de bloqueo, incorporar múltiples productos con diferentes tasas de consumo, y conectar este módulo con el Escenario B para una visión integrada de reservas y consumo.",
  },
  {
    id: "F",
    color: "orange",
    titulo: "Escenario F — Rumores y Pánico en la Red de Distribución",
    metodo: "Sistemas Lineales Mal Condicionados · Número de Condición · Perturbación de Datos",
    icono: "📣",
    aprendido:
      "Aprendimos que la estabilidad matemática de un sistema de distribución puede medirse con el número de condición κ(A). Un sistema mal condicionado (κ grande) amplifica cualquier perturbación: un rumor que aumenta la demanda un 5% puede generar un error del 500% en la distribución calculada. Esto explica matemáticamente por qué los rumores son tan destructivos.",
    masUtil:
      "El análisis del número de condición fue la herramienta más reveladora: permite clasificar objetivamente si una red de distribución es robusta o frágil ante la desinformación, sin necesidad de simulaciones complejas. La perturbación de datos permitió cuantificar el impacto de cada nivel de rumor.",
    limitaciones:
      "El modelo asume que la red de distribución es lineal y estática. En la realidad, los agentes económicos reaccionan al rumor de forma no lineal (pánico en cascada). Tampoco modela la propagación del rumor en redes sociales ni el efecto de desmentidos oficiales.",
    mejoras:
      "Incorporar modelos de propagación de información (SIR adaptado para rumores), usar sistemas no lineales para capturar comportamientos de pánico en cascada, y conectar con datos de redes sociales para detectar rumores en tiempo real.",
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; text: string; dot: string }> = {
  blue:   { border: "border-blue-700",   bg: "bg-blue-950/30",   badge: "bg-blue-800 text-blue-200",   text: "text-blue-400",   dot: "bg-blue-500" },
  yellow: { border: "border-yellow-700", bg: "bg-yellow-950/30", badge: "bg-yellow-800 text-yellow-200", text: "text-yellow-400", dot: "bg-yellow-500" },
  green:  { border: "border-green-700",  bg: "bg-green-950/30",  badge: "bg-green-800 text-green-200",  text: "text-green-400",  dot: "bg-green-500" },
  purple: { border: "border-purple-700", bg: "bg-purple-950/30", badge: "bg-purple-800 text-purple-200", text: "text-purple-400", dot: "bg-purple-500" },
  teal:   { border: "border-teal-700",   bg: "bg-teal-950/30",   badge: "bg-teal-800 text-teal-200",   text: "text-teal-400",   dot: "bg-teal-500" },
  orange: { border: "border-orange-700", bg: "bg-orange-950/30", badge: "bg-orange-800 text-orange-200", text: "text-orange-400", dot: "bg-orange-500" },
};

const SECCIONES = [
  { key: "aprendido",    label: "Qué se aprendió",                    icon: "🎓" },
  { key: "masUtil",      label: "Qué método fue más útil",            icon: "🏆" },
  { key: "limitaciones", label: "Limitaciones del modelo",            icon: "⚠️" },
  { key: "mejoras",      label: "Mejoras que se podrían implementar", icon: "🚀" },
];

export default function Conclusiones() {
  const [activeEsc, setActiveEsc] = useState("A");
  const esc = ESCENARIOS.find((e) => e.id === activeEsc)!;
  const c   = COLOR_MAP[esc.color];

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition mb-4 inline-block">
          ← Volver al inicio
        </Link>
        <span className="block text-xs font-semibold bg-gray-700 text-gray-300 px-3 py-1 rounded-full uppercase tracking-widest w-fit mb-3">
          Proyecto Final · Métodos Numéricos
        </span>
        <h1 className="text-3xl font-bold mb-2">Conclusiones</h1>
        <p className="text-gray-400 text-sm max-w-2xl">
          Análisis reflexivo de cada escenario: qué aprendimos, qué método destacó,
          qué limitaciones encontramos y cómo podría mejorarse el modelo.
        </p>
      </div>

      {/* Tabs de escenarios */}
      <div className="flex flex-wrap gap-2 mb-8">
        {ESCENARIOS.map((e) => {
          const cc = COLOR_MAP[e.color];
          const isActive = activeEsc === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setActiveEsc(e.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                isActive
                  ? `${cc.border} ${cc.bg} text-white`
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? cc.dot : "bg-gray-600"}`} />
              {e.icono} Escenario {e.id}
            </button>
          );
        })}
      </div>

      {/* Card del escenario activo */}
      <div className={`rounded-2xl border ${c.border} ${c.bg} p-6 mb-6`}>
        <div className="flex items-start gap-4 mb-5">
          <span className="text-4xl">{esc.icono}</span>
          <div>
            <h2 className={`text-xl font-bold ${c.text}`}>{esc.titulo}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${c.badge}`}>
              {esc.metodo}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECCIONES.map((sec) => (
            <div key={sec.key} className="bg-gray-900/70 rounded-xl p-4 border border-gray-800">
              <p className={`text-sm font-semibold mb-2 ${c.text}`}>
                {sec.icon} {sec.label}
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {esc[sec.key as keyof typeof esc] as string}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen global */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-3 text-white">📌 Reflexión general del proyecto</h2>
        <p className="text-sm text-gray-300 leading-relaxed mb-3">
          Este proyecto demostró que los métodos numéricos no son solo herramientas matemáticas abstractas,
          sino instrumentos poderosos para analizar y anticipar crisis reales. En el contexto de los bloqueos
          en Bolivia, cada escenario reveló una dimensión diferente del problema: desde la distribución
          logística hasta el impacto psicológico de los rumores.
        </p>
        <p className="text-sm text-gray-300 leading-relaxed mb-3">
          La combinación de <strong className="text-white">sistemas de ecuaciones lineales</strong> (Escenarios A y F),{" "}
          <strong className="text-white">ecuaciones diferenciales ordinarias</strong> (Escenario B),{" "}
          <strong className="text-white">interpolación</strong> (Escenario C) y{" "}
          <strong className="text-white">búsqueda de raíces</strong> (Escenarios D y E) permitió
          abordar el problema desde múltiples ángulos matemáticos complementarios.
        </p>
        <p className="text-sm text-gray-400 leading-relaxed">
          La principal lección transversal es que <strong className="text-white">ningún modelo es perfecto</strong>,
          pero un modelo bien construido y con limitaciones claras es infinitamente más útil que ningún modelo.
          La capacidad de cuantificar la incertidumbre — ya sea mediante el número de condición, el error de
          interpolación o la comparación entre métodos — es lo que distingue el análisis numérico del análisis cualitativo.
        </p>
      </div>
    </main>
  );
}