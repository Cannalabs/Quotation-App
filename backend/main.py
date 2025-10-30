from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from db import engine
from models import Base
from routers import company_settings as company_settings_router
from routers import customers as customers_router
from routers import products as products_router
from routers import quotes as quotes_router
from routers import users as users_router
from routers import countries as countries_router
from routers import email as email_router

app = FastAPI(title="Local Test API", version="0.1.0")

# CORS from env - Allow specific origins for network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173", 
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://192.168.1.76:5173",
        "http://192.168.1.76:5174",
        "http://192.168.1.76:3000"
    ],
    allow_credentials=True,  # Can be True with specific origins
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Root-level test routes
@app.get("/")
def root():
    return {"status": "ok", "message": "FastAPI root at /"}

@app.get("/hello")
def hello_root(name: str = "world"):
    return {"message": f"Hello, {name}!"}

@app.get("/items/{item_id}")
def read_item_root(item_id: int, q: str | None = None):
    return {"item_id": item_id, "query": q}

# API test routes
@app.get("/api/")
def read_root():
    return {"status": "ok", "message": "FastAPI is running"}

@app.get("/api/hello")
def hello(name: str = "world"):
    return {"message": f"Hello, {name}!"}

@app.get("/api/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "query": q}

# Company settings router (Postgres-backed)
app.include_router(company_settings_router.router)
app.include_router(customers_router.router)
app.include_router(products_router.router)
app.include_router(quotes_router.router)
app.include_router(users_router.router)
app.include_router(countries_router.router)
app.include_router(email_router.router)

# Silence favicon 404s
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)