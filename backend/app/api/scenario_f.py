from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

class ScenarioFInput(BaseModel):
    # Matriz A: sistema de distribución (n zonas × n productos)
    # A[i][j] = fracción del producto j que va a la zona i
    matrix_a: List[List[float]]
    # Vector b: demanda base de cada zona (Bs o unidades)
    vector_b: List[float]
    # Nivel de rumor: porcentaje de perturbación sobre b (0.05 = 5%)
    rumor_bajo: float = 0.05
    rumor_medio: float = 0.15
    rumor_alto: float = 0.30
    panico: float = 0.60
    # Nombres de zonas y productos
    zona_names: Optional[List[str]] = None
    producto_names: Optional[List[str]] = None

# ─── Utilidades ─────────────────────────────────────────────────────────────

def numero_condicion(A: np.ndarray) -> float:
    try:
        return float(np.linalg.cond(A))
    except:
        return float("inf")

def clasificar_condicion(cond: float) -> dict:
    if cond < 10:
        return {"nivel": "Bien condicionado", "color": "green",
                "desc": "El sistema es estable. Pequeños cambios en la demanda generan cambios pequeños en la distribución."}
    elif cond < 100:
        return {"nivel": "Moderadamente condicionado", "color": "yellow",
                "desc": "El sistema tiene cierta sensibilidad. Rumores moderados pueden alterar la distribución de forma notable."}
    elif cond < 1000:
        return {"nivel": "Mal condicionado", "color": "orange",
                "desc": "El sistema es inestable. Pequeños rumores pueden generar grandes cambios en la distribución."}
    else:
        return {"nivel": "Muy mal condicionado", "color": "red",
                "desc": "Sistema extremadamente inestable. Cualquier rumor, por pequeño que sea, puede colapsar la distribución."}

def resolver_sistema(A: np.ndarray, b: np.ndarray) -> Optional[np.ndarray]:
    try:
        return np.linalg.solve(A, b)
    except np.linalg.LinAlgError:
        return None

def perturbar_y_resolver(A: np.ndarray, b: np.ndarray, nivel: float, rng_seed: int = 42):
    """
    Perturba b con un nivel de rumor y resuelve el sistema perturbado.
    Retorna solución perturbada, delta_b, delta_x, error relativo.
    """
    rng = np.random.default_rng(rng_seed)
    # Perturbación proporcional al nivel de rumor (compra impulsiva = aumento de demanda)
    delta_b = nivel * np.abs(b) * (1 + rng.uniform(0, 0.2, size=b.shape))
    b_pert  = b + delta_b

    x_base = resolver_sistema(A, b)
    x_pert = resolver_sistema(A, b_pert)

    if x_base is None or x_pert is None:
        return None

    delta_x      = x_pert - x_base
    error_rel_b  = np.linalg.norm(delta_b) / np.linalg.norm(b)
    error_rel_x  = np.linalg.norm(delta_x) / np.linalg.norm(x_base) if np.linalg.norm(x_base) > 0 else 0
    amplificacion = error_rel_x / error_rel_b if error_rel_b > 0 else 0

    return {
        "b_perturbado": b_pert.tolist(),
        "delta_b": delta_b.tolist(),
        "x_base": x_base.tolist(),
        "x_perturbado": x_pert.tolist(),
        "delta_x": delta_x.tolist(),
        "error_rel_b": round(float(error_rel_b) * 100, 4),   # en %
        "error_rel_x": round(float(error_rel_x) * 100, 4),   # en %
        "amplificacion": round(float(amplificacion), 4),
    }

# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.post("/api/scenario-f/solve")
def solve_scenario_f(data: ScenarioFInput):
    A = np.array(data.matrix_a, dtype=float)
    b = np.array(data.vector_b, dtype=float)
    n = len(b)

    zona_names    = data.zona_names    or [f"Zona {i+1}"    for i in range(n)]
    producto_names = data.producto_names or [f"Producto {j+1}" for j in range(A.shape[1] if A.ndim == 2 else n)]

    # Validaciones
    if A.shape[0] != n or A.shape[1] != n:
        return {"error": f"La matriz A debe ser cuadrada de {n}×{n} para coincidir con el vector b de {n} elementos."}

    # Número de condición
    cond = numero_condicion(A)
    cond_info = clasificar_condicion(cond)

    # Solución base
    x_base_arr = resolver_sistema(A, b)
    if x_base_arr is None:
        return {"error": "El sistema no tiene solución única (matriz singular). Revisa los valores de la matriz A."}

    # Autovalores para análisis de estabilidad
    try:
        eigenvalues = np.linalg.eigvals(A)
        ratio_eigen = float(np.max(np.abs(eigenvalues)) / np.min(np.abs(eigenvalues[np.abs(eigenvalues) > 1e-10])))
    except:
        ratio_eigen = None

    # Perturbaciones por nivel de rumor
    niveles = {
        "rumor_bajo":  data.rumor_bajo,
        "rumor_medio": data.rumor_medio,
        "rumor_alto":  data.rumor_alto,
        "panico":      data.panico,
    }
    labels = {
        "rumor_bajo":  "Rumor bajo",
        "rumor_medio": "Rumor medio",
        "rumor_alto":  "Rumor alto",
        "panico":      "Pánico de compra",
    }
    colores = {
        "rumor_bajo":  "#22c55e",
        "rumor_medio": "#f59e0b",
        "rumor_alto":  "#f97316",
        "panico":      "#ef4444",
    }

    perturbaciones = {}
    for key, nivel in niveles.items():
        res = perturbar_y_resolver(A, b, nivel, rng_seed=42)
        if res:
            perturbaciones[key] = {
                **res,
                "nivel_pct": round(nivel * 100, 1),
                "label": labels[key],
                "color": colores[key],
            }

    # Zona más vulnerable: mayor amplificación de error en x
    vulnerabilidad_zonas = []
    for i in range(n):
        max_delta = max(
            abs(perturbaciones[k]["delta_x"][i])
            for k in perturbaciones if i < len(perturbaciones[k]["delta_x"])
        )
        base_val = abs(x_base_arr[i])
        pct_cambio = round((max_delta / base_val) * 100, 2) if base_val > 0 else 0
        vulnerabilidad_zonas.append({
            "zona": zona_names[i],
            "x_base": round(float(x_base_arr[i]), 4),
            "max_delta": round(float(max_delta), 4),
            "pct_cambio_max": pct_cambio,
        })

    zona_mas_vulnerable = max(vulnerabilidad_zonas, key=lambda z: z["pct_cambio_max"])

    # Tabla de sensibilidad: para cada nivel, error relativo en b y en x
    tabla_sensibilidad = [
        {
            "nivel": perturbaciones[k]["label"],
            "perturbacion_b_pct": perturbaciones[k]["nivel_pct"],
            "error_rel_b_pct": perturbaciones[k]["error_rel_b"],
            "error_rel_x_pct": perturbaciones[k]["error_rel_x"],
            "amplificacion": perturbaciones[k]["amplificacion"],
            "color": perturbaciones[k]["color"],
        }
        for k in perturbaciones
    ]

    return {
        "n": n,
        "zona_names": zona_names,
        "producto_names": producto_names,
        "numero_condicion": round(cond, 4),
        "cond_info": cond_info,
        "ratio_eigenvalues": round(ratio_eigen, 4) if ratio_eigen else None,
        "x_base": [round(float(v), 4) for v in x_base_arr],
        "b_base": [round(float(v), 4) for v in b],
        "perturbaciones": perturbaciones,
        "tabla_sensibilidad": tabla_sensibilidad,
        "vulnerabilidad_zonas": vulnerabilidad_zonas,
        "zona_mas_vulnerable": zona_mas_vulnerable,
        "matrix_a": [[round(v, 4) for v in row] for row in A.tolist()],
    }