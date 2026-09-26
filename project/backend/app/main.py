from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, agent, auth, complaints, manager, reviewer
from app.services.sla_monitor import start_sla_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_sla_scheduler()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="SupportNova API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(agent.router)
app.include_router(reviewer.router)
app.include_router(manager.router)
app.include_router(admin.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
