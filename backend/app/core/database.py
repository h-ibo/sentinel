import os 
from dotenv import load_dotenv 
from sqlmodel import create_engine, Session

load_dotenv()  # Load environment variables from .env file

DATABASE_URL = os.getenv("DATABASE_URL")  # Get the database URL from environment variables

engine = create_engine(DATABASE_URL, echo=True)  # Create a SQLAlchemy engine with the database URL

def get_session():
    """Create a new database session."""
    with Session(engine) as session:
        yield session  # Yield the session for use in a context manager

        