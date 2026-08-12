import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.database")

Base = declarative_base()

def get_database_url():
    # Check environment variables for PostgreSQL connection
    pg_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not pg_url:
        pg_user = os.getenv("POSTGRES_USER", "postgres")
        pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
        pg_host = os.getenv("POSTGRES_HOST", "localhost")
        pg_port = os.getenv("POSTGRES_PORT", "5432")
        pg_db = os.getenv("POSTGRES_DB", "roombook")
        pg_url = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

    return pg_url

def init_engine():
    pg_url = get_database_url()
    try:
        logger.info(f"Attempting PostgreSQL connection: {pg_url.split('@')[-1]}")
        engine = create_engine(pg_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        # Test connection
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database!")
        return engine, "postgresql"
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite database.")
        sqlite_url = "sqlite:///./roombook.db"
        engine = create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False}
        )
        logger.info("Successfully initialized SQLite fallback database (roombook.db).")
        return engine, "sqlite"

engine, DB_TYPE = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
