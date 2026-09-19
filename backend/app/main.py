from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .routes.reports import router as reports_router
from .routes.map import router as map_router

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Blocked Drain Civic Action Platform",
    description="AI-powered location-aware civic reporting platform",
    version="1.0.0"
)


# -----------------------------
# CORS CONFIGURATION
# -----------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# -----------------------------
# STATIC FILES
# -----------------------------

# Serve uploaded report evidence images
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)


# -----------------------------
# ROUTES
# -----------------------------

app.include_router(reports_router)
app.include_router(map_router)


@app.get("/")
def root():

    return {
        "message": "Blocked Drain Civic Action Platform API",
        "status": "running"
    }