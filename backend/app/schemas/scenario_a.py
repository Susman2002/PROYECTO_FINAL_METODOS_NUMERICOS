from pydantic import BaseModel
from typing import List, Optional

class LinearSystemInput(BaseModel):
    A: List[List[float]]
    b: List[float]
    method: str  # "jacobi" | "gauss_seidel" | "sor" | "lu" | "conjugate_gradient"
    tol: Optional[float] = 1e-6
    max_iter: Optional[int] = 100
    omega: Optional[float] = 1.25  # solo para SOR
    zone_names: Optional[List[str]] = None
    source_names: Optional[List[str]] = None