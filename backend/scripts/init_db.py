from app.core.database import engine
from app.models.vulnerability import Vulnerability
from sqlmodel import SQLModel

SQLModel.metadata.create_all(engine)
print("Tablolar oluşturuldu.")