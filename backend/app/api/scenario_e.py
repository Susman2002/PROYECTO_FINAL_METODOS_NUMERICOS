from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

class ScenarioEInput(BaseModel):
    model: str          # "costo", "carburante", "social"
    method: str         # "biseccion", "newton", "secante"
    # Parámetros modelo "costo" — día en que ahorros se agotan
    ingreso_mensual: Optional[float] = 3000
    ahorro_inicial: Optional[float] = 1500
    costo_base: Optional[float] = 80        # Bs/día canasta base
    tasa_inflacion: Optional[float] = 0.03  # incremento diario del costo
    # Parámetros modelo "carburante" — tasa de reposición crítica
    consumo_diario: Optional[float] = 5000  # litros/día
    reserva_actual: Optional[float] = 40000 # litros
    tasa_reposicion: Optional[float] = 2000 # litros/día actuales
    dias_bloqueo: Optional[float] = 10      # días de bloqueo
    # Parámetros modelo "social" — umbral de masificación
    poblacion: Optional[float] = 100000
    tasa_contagio: Optional[float] = 0.15
    umbral_critico: Optional[float] = 0.3   # fracción de población
    # Parámetros numéricos
    a: Optional[float] = 0.0               # extremo izquierdo (bisección/secante)
    b: Optional[float] = 60.0             # extremo derecho / x1 secante
    x0: Optional[float] = 15.0            # punto inicial Newton / x0 secante
    tol: Optional[float] = 1e-6
    max_iter: Optional[int] = 100

# ─── Definición de funciones y derivadas ────────────────────────────────────

def get_function(model: str, params: ScenarioEInput):
    """
    Retorna (f, df, descripcion, x_label, y_label, x_range)
    f(x)  = función cuya raíz buscamos
    df(x) = derivada analítica (para Newton-Raphson)
    """
    if model == "costo":
        # f(x) = ahorro_inicial + ingreso_mensual/30*x - costo_base*(1+tasa)^x = 0
        # Día x en que el dinero disponible ya no cubre el gasto acumulado
        I  = params.ingreso_mensual / 30   # ingreso diario
        A  = params.ahorro_inicial
        C0 = params.costo_base
        r  = params.tasa_inflacion

        def f(x):
            ingreso_acum = A + I * x
            gasto_acum   = C0 * ((1 + r)**x - 1) / r if r != 0 else C0 * x
            return ingreso_acum - gasto_acum

        def df(x):
            dingreso = I
            dgasto   = C0 * np.log(1 + r) * (1 + r)**x if r != 0 else C0
            return dingreso - dgasto

        return f, df, (
            "Día exacto en que el gasto acumulado supera los ingresos + ahorros disponibles",
            "Día del mes (x)", "Saldo disponible (Bs)", (1, 60)
        )

    elif model == "carburante":
        # f(x) = reserva_actual - consumo*x + reposicion*x = 0
        # Tasa de reposición crítica r* tal que reservas no llegan a cero
        # Reformulado: f(r) = reserva - (consumo - r)*dias = 0
        # Buscamos r (tasa de reposición) que hace reserva = 0 en dias_bloqueo
        C = params.consumo_diario
        R = params.reserva_actual
        D = params.dias_bloqueo

        def f(x):
            # x = tasa de reposición (litros/día)
            return R - (C - x) * D

        def df(x):
            return D  # derivada constante

        return f, df, (
            "Tasa de reposición crítica (litros/día) que iguala consumo y llegada de carburante",
            "Tasa de reposición (litros/día)", "Balance de reservas (litros)", (0, C)
        )

    elif model == "social":
        # Modelo logístico de difusión social
        # f(x) = x*(1 - x/N)*r - umbral*N = 0
        # Buscamos x (número de personas) donde la tasa de crecimiento supera umbral crítico
        N  = params.poblacion
        r  = params.tasa_contagio
        uc = params.umbral_critico

        def f(x):
            # Tasa neta de crecimiento de protestas menos umbral de masificación
            return r * x * (1 - x / N) - uc * N

        def df(x):
            return r * (1 - 2 * x / N)

        return f, df, (
            "Umbral de personas donde el movimiento social pasa de local a masificación",
            "Personas movilizadas (x)", "Tasa neta de crecimiento - umbral", (0, N)
        )

    else:
        raise ValueError(f"Modelo desconocido: {model}")

# ─── Métodos numéricos ───────────────────────────────────────────────────────

def biseccion(f, a, b, tol, max_iter):
    iteraciones = []
    if f(a) * f(b) > 0:
        raise ValueError("f(a) y f(b) deben tener signos opuestos para bisección.")
    for i in range(1, max_iter + 1):
        c = (a + b) / 2
        fc = f(c)
        error = abs(b - a) / 2
        iteraciones.append({
            "iter": i, "a": round(a, 8), "b": round(b, 8),
            "c": round(c, 8), "f(c)": round(fc, 8), "error": round(error, 10)
        })
        if error < tol or fc == 0:
            break
        if f(a) * fc < 0:
            b = c
        else:
            a = c
    return c, iteraciones

def newton_raphson(f, df, x0, tol, max_iter):
    iteraciones = []
    x = x0
    for i in range(1, max_iter + 1):
        fx  = f(x)
        dfx = df(x)
        if abs(dfx) < 1e-14:
            raise ValueError("Derivada cercana a cero — Newton-Raphson no converge.")
        x_new = x - fx / dfx
        error = abs(x_new - x)
        iteraciones.append({
            "iter": i, "x": round(x, 8), "f(x)": round(fx, 8),
            "f'(x)": round(dfx, 8), "x_nuevo": round(x_new, 8), "error": round(error, 10)
        })
        x = x_new
        if error < tol:
            break
    return x, iteraciones

def secante(f, x0, x1, tol, max_iter):
    iteraciones = []
    for i in range(1, max_iter + 1):
        f0, f1 = f(x0), f(x1)
        if abs(f1 - f0) < 1e-14:
            raise ValueError("División por cero en método de la secante.")
        x2 = x1 - f1 * (x1 - x0) / (f1 - f0)
        error = abs(x2 - x1)
        iteraciones.append({
            "iter": i, "x0": round(x0, 8), "x1": round(x1, 8),
            "f(x1)": round(f1, 8), "x2": round(x2, 8), "error": round(error, 10)
        })
        x0, x1 = x1, x2
        if error < tol:
            break
    return x2, iteraciones

def estimar_orden_convergencia(iteraciones: list, key_x: str) -> Optional[float]:
    """Estima el orden de convergencia p usando los últimos 3 errores."""
    errors = [it["error"] for it in iteraciones if it["error"] > 1e-14]
    if len(errors) < 3:
        return None
    e1, e2, e3 = errors[-3], errors[-2], errors[-1]
    try:
        p = np.log(e3 / e2) / np.log(e2 / e1)
        return round(float(p), 3)
    except:
        return None

# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.post("/api/scenario-e/solve")
def solve_scenario_e(data: ScenarioEInput):
    f, df, (descripcion, x_label, y_label, x_range) = get_function(data.model, data)

    # Ejecutar método
    try:
        if data.method == "biseccion":
            raiz, iteraciones = biseccion(f, data.a, data.b, data.tol, data.max_iter)
        elif data.method == "newton":
            raiz, iteraciones = newton_raphson(f, df, data.x0, data.tol, data.max_iter)
        elif data.method == "secante":
            raiz, iteraciones = secante(f, data.x0, data.b, data.tol, data.max_iter)
        else:
            raise ValueError("Método no reconocido.")
    except ValueError as e:
        return {"error": str(e)}

    # Curva de la función para graficar
    x_vals = np.linspace(x_range[0], x_range[1], 400)
    y_vals = []
    for xv in x_vals:
        try:
            y_vals.append(float(f(xv)))
        except:
            y_vals.append(None)

    # Comparación entre los 3 métodos
    comparacion = {}
    for m in ["biseccion", "newton", "secante"]:
        try:
            if m == "biseccion":
                r, its = biseccion(f, data.a, data.b, data.tol, data.max_iter)
            elif m == "newton":
                r, its = newton_raphson(f, df, data.x0, data.tol, data.max_iter)
            else:
                r, its = secante(f, data.x0, data.b, data.tol, data.max_iter)
            orden = estimar_orden_convergencia(its, "x")
            comparacion[m] = {
                "raiz": round(r, 8),
                "iteraciones": len(its),
                "error_final": its[-1]["error"],
                "orden_convergencia": orden,
            }
        except Exception as ex:
            comparacion[m] = {"error": str(ex)}

    orden_convergencia = estimar_orden_convergencia(iteraciones, "x")

    return {
        "model": data.model,
        "method": data.method,
        "descripcion": descripcion,
        "x_label": x_label,
        "y_label": y_label,
        "raiz": round(raiz, 8),
        "f_raiz": round(float(f(raiz)), 10),
        "iteraciones_count": len(iteraciones),
        "orden_convergencia": orden_convergencia,
        "iteraciones": iteraciones,
        "curva_x": [round(float(x), 4) for x in x_vals],
        "curva_y": [round(y, 4) if y is not None else None for y in y_vals],
        "comparacion": comparacion,
        "params": data.dict(),
    }