from fastapi import APIRouter, HTTPException
from app.schemas.scenario_a import LinearSystemInput
from app.numerical_methods.linear_systems import (
    jacobi, gauss_seidel, sor, lu_decomposition, conjugate_gradient
)

router = APIRouter(prefix="/api/scenario-a", tags=["Escenario A"])

@router.post("/solve")
def solve_linear_system(data: LinearSystemInput):
    A = data.A
    b = data.b
    n = len(b)

    if len(A) != n or any(len(row) != n for row in A):
        raise HTTPException(status_code=400, detail="La matriz A debe ser cuadrada y compatible con b.")

    for i in range(n):
        if A[i][i] == 0:
            raise HTTPException(status_code=400, detail=f"El elemento diagonal A[{i}][{i}] es cero. El método puede no converger.")

    methods = {
        "jacobi": lambda: jacobi(A, b, data.tol, data.max_iter),
        "gauss_seidel": lambda: gauss_seidel(A, b, data.tol, data.max_iter),
        "sor": lambda: sor(A, b, data.omega, data.tol, data.max_iter),
        "lu": lambda: lu_decomposition(A, b),
        "conjugate_gradient": lambda: conjugate_gradient(A, b, data.tol, data.max_iter),
    }

    if data.method not in methods:
        raise HTTPException(status_code=400, detail="Método no reconocido.")

    result = methods[data.method]()

    zone_names = data.zone_names or [f"Zona {i+1}" for i in range(n)]
    source_names = data.source_names or [f"Planta {i+1}" for i in range(n)]

    solution_labeled = [
        {"variable": f"x{i+1}", "value": round(result["solution"][i], 4), "label": zone_names[i]}
        for i in range(n)
    ]

    return {
        "method": data.method,
        "solution": result["solution"],
        "solution_labeled": solution_labeled,
        "iterations": result["iterations"],
        "converged": result["converged"],
        "total_iterations": len(result["iterations"]),
    }