import numpy as np
from typing import Optional

def jacobi(A, b, tol=1e-6, max_iter=100):
    A = np.array(A, dtype=float)
    b = np.array(b, dtype=float)
    n = len(b)
    x = np.zeros(n)
    iterations = []

    for k in range(max_iter):
        x_new = np.zeros(n)
        for i in range(n):
            s = sum(A[i][j] * x[j] for j in range(n) if j != i)
            x_new[i] = (b[i] - s) / A[i][i]

        error = np.linalg.norm(x_new - x, np.inf)
        iterations.append({"iteration": k + 1, "x": x_new.tolist(), "error": error})

        if error < tol:
            return {"solution": x_new.tolist(), "iterations": iterations, "converged": True}
        x = x_new.copy()

    return {"solution": x.tolist(), "iterations": iterations, "converged": False}


def gauss_seidel(A, b, tol=1e-6, max_iter=100):
    A = np.array(A, dtype=float)
    b = np.array(b, dtype=float)
    n = len(b)
    x = np.zeros(n)
    iterations = []

    for k in range(max_iter):
        x_old = x.copy()
        for i in range(n):
            s = sum(A[i][j] * x[j] for j in range(n) if j != i)
            x[i] = (b[i] - s) / A[i][i]

        error = np.linalg.norm(x - x_old, np.inf)
        iterations.append({"iteration": k + 1, "x": x.tolist(), "error": error})

        if error < tol:
            return {"solution": x.tolist(), "iterations": iterations, "converged": True}

    return {"solution": x.tolist(), "iterations": iterations, "converged": False}


def sor(A, b, omega=1.25, tol=1e-6, max_iter=100):
    A = np.array(A, dtype=float)
    b = np.array(b, dtype=float)
    n = len(b)
    x = np.zeros(n)
    iterations = []

    for k in range(max_iter):
        x_old = x.copy()
        for i in range(n):
            s = sum(A[i][j] * x[j] for j in range(n) if j != i)
            x_gs = (b[i] - s) / A[i][i]
            x[i] = (1 - omega) * x[i] + omega * x_gs

        error = np.linalg.norm(x - x_old, np.inf)
        iterations.append({"iteration": k + 1, "x": x.tolist(), "error": error})

        if error < tol:
            return {"solution": x.tolist(), "iterations": iterations, "converged": True}

    return {"solution": x.tolist(), "iterations": iterations, "converged": False}


def lu_decomposition(A, b):
    A = np.array(A, dtype=float)
    b = np.array(b, dtype=float)
    n = len(b)
    L = np.zeros((n, n))
    U = np.zeros((n, n))

    for i in range(n):
        L[i][i] = 1
        for j in range(i, n):
            U[i][j] = A[i][j] - sum(L[i][k] * U[k][j] for k in range(i))
        for j in range(i + 1, n):
            L[j][i] = (A[j][i] - sum(L[j][k] * U[k][i] for k in range(i))) / U[i][i]

    # Ly = b
    y = np.zeros(n)
    for i in range(n):
        y[i] = b[i] - sum(L[i][k] * y[k] for k in range(i))

    # Ux = y
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (y[i] - sum(U[i][k] * x[k] for k in range(i + 1, n))) / U[i][i]

    return {
        "solution": x.tolist(),
        "L": L.tolist(),
        "U": U.tolist(),
        "iterations": [{"iteration": 1, "x": x.tolist(), "error": 0.0}],
        "converged": True
    }


def conjugate_gradient(A, b, tol=1e-6, max_iter=100):
    A = np.array(A, dtype=float)
    b = np.array(b, dtype=float)
    x = np.zeros(len(b))
    r = b - A @ x
    p = r.copy()
    iterations = []

    for k in range(max_iter):
        Ap = A @ p
        alpha = (r @ r) / (p @ Ap)
        x = x + alpha * p
        r_new = r - alpha * Ap
        error = np.linalg.norm(r_new)
        iterations.append({"iteration": k + 1, "x": x.tolist(), "error": error})

        if error < tol:
            return {"solution": x.tolist(), "iterations": iterations, "converged": True}

        beta = (r_new @ r_new) / (r @ r)
        p = r_new + beta * p
        r = r_new.copy()

    return {"solution": x.tolist(), "iterations": iterations, "converged": False}