import json
import logging
import sys
from pathlib import Path
from sqlmodel import Session, SQLModel

# Adds the backend directory to Python path to prevent 'ModuleNotFoundError'
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import engine
from app.models.vulnerability import Vulnerability

# Configure logging to see what happens in the terminal
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def create_db_and_tables():
    """Creates the tables in the PostgreSQL database based on our SQLModel classes."""
    logger.info("Creating database tables...")
    SQLModel.metadata.create_all(engine)

def seed_data():
    """Reads the JSON file, validates data, and inserts it into the database."""
    json_path = Path("data/mock_vulnerabilities.json")

    if not json_path.exists():
        logger.error(f"Data file not found at {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    logger.info(f"Found {len(data)} vulnerabilities in the JSON file. Starting insertion...")

    with Session(engine) as session:
        for item in data:
            try:
                vulnerability = Vulnerability(**item)
                session.add(vulnerability)
                session.commit()
                logger.info(f"Inserted CVE: {vulnerability.cve_id}")
            except Exception as e:
                session.rollback()
                logger.error(f"Failed to insert item: {item}. Error: {e}")

        logger.info("Database seeding completed!")

if __name__ == "__main__":
    create_db_and_tables()
    seed_data()