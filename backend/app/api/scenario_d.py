from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import numpy as np

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

class ProductoCanasta(BaseModel):
    nombre: str
    dias: List[float]        # Días con precio registrado
    precios: List[float]     # Precio en Bs de ese día
    cantidad_diaria: float   # Cuánto compra la familia por día (kg, unidades, etc.)
    unidad: str              # "kg", "unidad", "litro", etc.

class ScenarioDInput(BaseModel):
    productos: List[ProductoCanasta]
    ingreso_mensual: float   # Ingreso mensual de la familia en Bs
    method: str              # "trapecio", "simpson13", "simpson38"

# ─── Interpolación auxiliar (spline para curva continua) ─────────────────────

def interpolar_spline(x_data, y_data, x_eval):
    """Spline cúbico natural para obtener curva continua de precios"""
    n = len(x_data)
    if n < 3:
        # Interpolación lineal si hay pocos puntos
        return [float(np.interp(x, x_data, y_data)) for x in x_eval]

    h = [x_data[i+1] - x_data[i] for i in range(n-1)]
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
        idx = n - 2
        for i in range(n - 1):
            if x <= x_data[i+1]:
                idx = i
                break
        dx = x - x_data[idx]
        hi = h[idx]
        a  = y_data[idx]
        b_ = (y_data[idx+1] - y_data[idx]) / hi - hi * (2*M[idx] + M[idx+1]) / 3
        c_ = M[idx]
        d_ = (M[idx+1] - M[idx]) / (3 * hi)
        results.append(float(a + b_*dx + c_*dx**2 + d_*dx**3))
    return results

# ─── Métodos de integración ──────────────────────────────────────────────────

def trapecio(y_vals, h):
    """Regla del trapecio compuesta"""
    n = len(y_vals)
    total = y_vals[0] + y_vals[-1]
    for i in range(1, n - 1):
        total += 2 * y_vals[i]
    return (h / 2) * total

def simpson_13(y_vals, h):
    """Regla de Simpson 1/3 compuesta — requiere n par (número de intervalos)"""
    n = len(y_vals) - 1  # número de intervalos
    # Si n es impar, usamos trapecio en el último intervalo
    if n % 2 != 0:
        result = simpson_13(y_vals[:-1], h)
        result += (h / 2) * (y_vals[-2] + y_vals[-1])
        return result
    total = y_vals[0] + y_vals[-1]
    for i in range(1, n):
        coef = 4 if i % 2 != 0 else 2
        total += coef * y_vals[i]
    return (h / 3) * total

def simpson_38(y_vals, h):
    """Regla de Simpson 3/8 compuesta — requiere múltiplos de 3 intervalos"""
    n = len(y_vals) - 1
    # Ajuste si no es múltiplo de 3
    remainder = n % 3
    if remainder != 0:
        result = simpson_38(y_vals[:n - remainder + 1], h)
        for i in range(n - remainder, n):
            result += (h / 2) * (y_vals[i] + y_vals[i+1])
        return result
    total = y_vals[0] + y_vals[-1]
    for i in range(1, n):
        coef = 3 if i % 3 != 0 else 2
        total += coef * y_vals[i]
    return (3 * h / 8) * total

# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.post("/api/scenario-d/solve")
def solve_scenario_d(data: ScenarioDInput):
    # Días de integración: día 1 al 30 con paso h
    n_puntos = 30
    dias_integracion = [float(i) for i in range(1, n_puntos + 1)]
    h = 1.0  # paso de 1 día

    resultados_productos = []
    gasto_total_real = 0.0
    gasto_total_sin_inflacion = 0.0

    for prod in data.productos:
        x = prod.dias
        y = prod.precios

        # Curva continua de precios (día 1 al 30)
        precios_curva = interpolar_spline(x, y, dias_integracion)
        precios_curva = [max(0, p) for p in precios_curva]  # no negativos

        # Costo diario = precio * cantidad_diaria
        costos_diarios = [p * prod.cantidad_diaria for p in precios_curva]

        # Precio base (día 1) para comparación sin inflación
        precio_base = precios_curva[0]
        costos_sin_inflacion = [precio_base * prod.cantidad_diaria] * n_puntos

        # Integración según método
        if data.method == "trapecio":
            gasto_real = trapecio(costos_diarios, h)
            gasto_base = trapecio(costos_sin_inflacion, h)
        elif data.method == "simpson13":
            gasto_real = simpson_13(costos_diarios, h)
            gasto_base = simpson_13(costos_sin_inflacion, h)
        elif data.method == "simpson38":
            gasto_real = simpson_38(costos_diarios, h)
            gasto_base = simpson_38(costos_sin_inflacion, h)
        else:
            gasto_real = trapecio(costos_diarios, h)
            gasto_base = trapecio(costos_sin_inflacion, h)

        # Comparación entre los 3 métodos
        comparacion_metodos = {
            "trapecio":   round(trapecio(costos_diarios, h), 2),
            "simpson13":  round(simpson_13(costos_diarios, h), 2),
            "simpson38":  round(simpson_38(costos_diarios, h), 2),
        }

        perdida = gasto_real - gasto_base
        pct_perdida = round((perdida / gasto_base) * 100, 2) if gasto_base > 0 else 0

        gasto_total_real += gasto_real
        gasto_total_sin_inflacion += gasto_base

        resultados_productos.append({
            "nombre": prod.nombre,
            "unidad": prod.unidad,
            "cantidad_diaria": prod.cantidad_diaria,
            "precio_inicial": round(precio_base, 2),
            "precio_final": round(precios_curva[-1], 2),
            "gasto_real": round(gasto_real, 2),
            "gasto_sin_inflacion": round(gasto_base, 2),
            "perdida_bs": round(perdida, 2),
            "perdida_pct": pct_perdida,
            "dias": dias_integracion,
            "costos_diarios": [round(c, 2) for c in costos_diarios],
            "costos_sin_inflacion": [round(c, 2) for c in costos_sin_inflacion],
            "precios_curva": [round(p, 2) for p in precios_curva],
            "comparacion_metodos": comparacion_metodos,
        })

    perdida_total = gasto_total_real - gasto_total_sin_inflacion
    pct_ingreso_real = round((gasto_total_real / data.ingreso_mensual) * 100, 2) if data.ingreso_mensual > 0 else 0
    pct_ingreso_base = round((gasto_total_sin_inflacion / data.ingreso_mensual) * 100, 2) if data.ingreso_mensual > 0 else 0

    # Producto que más afectó al gasto
    mayor_impacto = max(resultados_productos, key=lambda p: p["perdida_bs"])

    return {
        "method": data.method,
        "productos": resultados_productos,
        "gasto_total_real": round(gasto_total_real, 2),
        "gasto_total_sin_inflacion": round(gasto_total_sin_inflacion, 2),
        "perdida_total_bs": round(perdida_total, 2),
        "perdida_total_pct": round((perdida_total / gasto_total_sin_inflacion) * 100, 2) if gasto_total_sin_inflacion > 0 else 0,
        "pct_ingreso_real": pct_ingreso_real,
        "pct_ingreso_base": pct_ingreso_base,
        "mayor_impacto": mayor_impacto["nombre"],
        "ingreso_mensual": data.ingreso_mensual,
    }