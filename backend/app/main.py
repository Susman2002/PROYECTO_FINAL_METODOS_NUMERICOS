from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from app.api import scenario_a, scenario_b, scenario_c, scenario_d
from app.api import scenario_a, scenario_b, scenario_c, scenario_d, scenario_e, scenario_f





app = FastAPI(
    title="Métodos Numéricos - Bolivia",
    version="1.0.0"
)

origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenario_a.router)
app.include_router(scenario_b.router)
app.include_router(scenario_c.router)
app.include_router(scenario_d.router)
app.include_router(scenario_e.router)
app.include_router(scenario_f.router)

@app.get("/")
def root():
    return {"message": "Backend funcionando correctamente"}

@app.get("/health")
def health():
    return {"status": "ok"}

