from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.vulnerability import Vulnerability

router = APIRouter()

@router.get("/", response_model=List[Vulnerability])
def read_vulnerabilities(
    skip: int = 0, 
    limit: int = Query(default=20, le=100), 
    session: Session = Depends(get_session)
):
    """
    Retrieve all vulnerabilities with pagination.
    skip: How many records to skip (for pagination).
    limit: Maximum number of records to return.
    """
    vulnerabilities = session.exec(select(Vulnerability).offset(skip).limit(limit)).all()
    return vulnerabilities

@router.get("/{id}", response_model=Vulnerability)
def read_vulnerability(id: int, session: Session = Depends(get_session)):
    """
    Retrieve a specific vulnerability by its database ID.
    If the ID does not exist, return a 404 Not Found error.
    """
    vulnerability = session.get(Vulnerability, id)
    if not vulnerability:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    return vulnerability

@router.post("/", response_model=Vulnerability)
def create_vulnerability(vulnerability: Vulnerability, session: Session = Depends(get_session)):
    """
    Create a new vulnerability record in the database.
    """
    session.add(vulnerability)
    session.commit()
    # Refresh to get the auto-generated ID and detected_at timestamp from the DB
    session.refresh(vulnerability)
    return vulnerability