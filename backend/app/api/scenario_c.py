from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import numpy as np

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

class FoodItem(BaseModel):
    nombre: str
    dias: List[float]       # Días con dato conocido
    precios: List[float]    # Precios en esos días (Bs)

class ScenarioCInput(BaseModel):
    alimentos: List[FoodItem]
    dias_consulta: List[float]   # Días donde queremos estimar el precio
    method: str                  # "lagrange", "newton", "spline"

# ─── Métodos numéricos ───────────────────────────────────────────────────────

def lagrange(x_data, y_data, x_eval):
    """Interpolación de Lagrange"""
    n = len(x_data)
    results = []
    for x in x_eval:
        total = 0.0
        for i in range(n):
            term = y_data[i]
            for j in range(n):
                if i != j:
                    denom = x_data[i] - x_data[j]
                    if abs(denom) < 1e-12:
                        term = 0
                        break
                    term *= (x - x_data[j]) / denom
            total += term
        results.append(round(float(total), 4))
    return results

def newton_divided_differences(x_data, y_data):
    """Tabla de diferencias divididas para Newton"""
    n = len(x_data)
    coef = list(y_data)
    for j in range(1, n):
        for i in range(n - 1, j - 1, -1):
            denom = x_data[i] - x_data[i - j]
            if abs(denom) < 1e-12:
                coef[i] = 0
            else:
                coef[i] = (coef[i] - coef[i - 1]) / denom
    return coef

def newton_eval(x_data, coef, x_eval):
    """Evalúa el polinomio de Newton en los puntos x_eval"""
    results = []
    n = len(coef)
    for x in x_eval:
        val = coef[n - 1]
        for i in range(n - 2, -1, -1):
            val = val * (x - x_data[i]) + coef[i]
        results.append(round(float(val), 4))
    return results

def spline_cubico(x_data, y_data, x_eval):
    """Splines cúbicos naturales"""
    n = len(x_data)
    if n < 3:
        # Fallback a lineal si hay pocos puntos
        return lagrange(x_data, y_data, x_eval)

    h = [x_data[i+1] - x_data[i] for i in range(n-1)]

    # Sistema tridiagonal para los momentos M
    A = np.zeros((n, n))
    b = np.zeros(n)
    A[0][0] = 1
    A[n-1][n-1] = 1

    for i in range(1, n-1):
        A[i][i-1] = h[i-1]
        A[i][i]   = 2 * (h[i-1] + h[i])
        A[i][i+1] = h[i]
        b[i] = 3 * ((y_data[i+1] - y_data[i]) / h[i] - (y_data[i] - y_data[i-1]) / h[i-1])

    M = np.linalg.solve(A, b)

    results = []
    for x in x_eval:
        # Encontrar el intervalo correcto
        idx = n - 2
        for i in range(n - 1):
            if x <= x_data[i+1]:
                idx = i
                break

        dx = x - x_data[idx]
        hi = h[idx]
        a = y_data[idx]
        b_coef = (y_data[idx+1] - y_data[idx]) / hi - hi * (2*M[idx] + M[idx+1]) / 3
        c_coef = M[idx]
        d_coef = (M[idx+1] - M[idx]) / (3 * hi)

        val = a + b_coef*dx + c_coef*dx**2 + d_coef*dx**3
        results.append(round(float(val), 4))
    return results

# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.post("/api/scenario-c/solve")
def solve_scenario_c(data: ScenarioCInput):
    response = []

    for alimento in data.alimentos:
        x = alimento.dias
        y = alimento.precios
        x_eval = data.dias_consulta

        if data.method == "lagrange":
            estimados = lagrange(x, y, x_eval)
        elif data.method == "newton":
            coef = newton_divided_differences(x, y)
            estimados = newton_eval(x, coef, x_eval)
        elif data.method == "spline":
            estimados = spline_cubico(x, y, x_eval)
        else:
            estimados = lagrange(x, y, x_eval)

        # Curva completa para graficar (día 1 al 30)
        dias_curva = [round(i * 0.5, 1) for i in range(2, 61)]  # 1 a 30 en pasos de 0.5
        if data.method == "lagrange":
            curva = lagrange(x, y, dias_curva)
        elif data.method == "newton":
            coef = newton_divided_differences(x, y)
            curva = newton_eval(x, coef, dias_curva)
        else:
            curva = spline_cubico(x, y, dias_curva)

        precio_min = min(y)
        precio_max = max(y)
        incremento = round(((precio_max - precio_min) / precio_min) * 100, 2)
        dia_max = x[y.index(precio_max)]
        dia_min = x[y.index(precio_min)]

        response.append({
            "nombre": alimento.nombre,
            "dias_conocidos": x,
            "precios_conocidos": y,
            "dias_consulta": x_eval,
            "precios_estimados": estimados,
            "curva_dias": dias_curva,
            "curva_precios": curva,
            "precio_min": precio_min,
            "precio_max": precio_max,
            "incremento_pct": incremento,
            "dia_precio_min": dia_min,
            "dia_precio_max": dia_max,
        })

    return {
        "method": data.method,
        "alimentos": response,
        "mayor_incremento": max(response, key=lambda a: a["incremento_pct"])["nombre"],
    }