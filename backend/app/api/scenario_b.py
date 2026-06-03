from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class ScenarioBInput(BaseModel):
    method: str                  # "euler", "heun", "rk4"
    R0: float                    # Reserva inicial (cisternas)
    entrada: float               # Abastecimiento diario (cisternas/día)
    consumo: float               # Consumo diario normal (cisternas/día)
    consumo_extra: float = 0.0   # Consumo extra por pánico/bloqueo
    dias: int = 30               # Días a simular
    nivel_critico: float = 20.0  # Nivel crítico de alerta (cisternas)
    h: float = 1.0               # Paso de tiempo (días)

def dR_dt(t, R, entrada, consumo, consumo_extra):
    """Tasa de cambio de la reserva en el tiempo"""
    consumo_total = consumo + consumo_extra
    return entrada - consumo_total

def euler(R0, entrada, consumo, consumo_extra, dias, h):
    t, R = 0.0, R0
    results = [{"dia": 0, "reserva": R0}]
    while t < dias:
        dR = dR_dt(t, R, entrada, consumo, consumo_extra)
        R = R + h * dR
        t += h
        results.append({"dia": round(t, 4), "reserva": round(R, 4)})
    return results

def heun(R0, entrada, consumo, consumo_extra, dias, h):
    t, R = 0.0, R0
    results = [{"dia": 0, "reserva": R0}]
    while t < dias:
        k1 = dR_dt(t, R, entrada, consumo, consumo_extra)
        R_pred = R + h * k1
        k2 = dR_dt(t + h, R_pred, entrada, consumo, consumo_extra)
        R = R + (h / 2) * (k1 + k2)
        t += h
        results.append({"dia": round(t, 4), "reserva": round(R, 4)})
    return results

def rk4(R0, entrada, consumo, consumo_extra, dias, h):
    t, R = 0.0, R0
    results = [{"dia": 0, "reserva": R0}]
    while t < dias:
        k1 = dR_dt(t, R, entrada, consumo, consumo_extra)
        k2 = dR_dt(t + h/2, R + h*k1/2, entrada, consumo, consumo_extra)
        k3 = dR_dt(t + h/2, R + h*k2/2, entrada, consumo, consumo_extra)
        k4 = dR_dt(t + h, R + h*k3, entrada, consumo, consumo_extra)
        R = R + (h / 6) * (k1 + 2*k2 + 2*k3 + k4)
        t += h
        results.append({"dia": round(t, 4), "reserva": round(R, 4)})
    return results

def find_critical_day(results, nivel_critico):
    for point in results:
        if point["reserva"] <= nivel_critico:
            return point["dia"]
    return None

@router.post("/api/scenario-b/solve")
def solve_scenario_b(data: ScenarioBInput):
    methods_map = {
        "euler": euler,
        "heun": heun,
        "rk4": rk4,
    }

    all_results = {}
    critical_days = {}

    for method_key, method_fn in methods_map.items():
        res = method_fn(
            data.R0, data.entrada, data.consumo,
            data.consumo_extra, data.dias, data.h
        )
        all_results[method_key] = res
        critical_days[method_key] = find_critical_day(res, data.nivel_critico)

    selected = all_results[data.method]
    net_rate = data.entrada - (data.consumo + data.consumo_extra)

    return {
        "selected_method": data.method,
        "selected_results": selected,
        "all_methods": all_results,
        "critical_days": critical_days,
        "net_rate": round(net_rate, 4),
        "final_reserve": round(selected[-1]["reserva"], 4),
        "initial_reserve": data.R0,
        "nivel_critico": data.nivel_critico,
        "dias_simulados": data.dias,
    }