import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.vulnerability import Vulnerability
from app.core.connection_manager import manager
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Vulnerability])
def read_vulnerabilities(
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    session: Session = Depends(get_session),
    current_user: str = Depends(get_current_user),
):
    """
    Retrieve all vulnerabilities with pagination.
    Requires a valid JWT token.
    """
    vulnerabilities = session.exec(select(Vulnerability).offset(skip).limit(limit)).all()
    return vulnerabilities


@router.get("/{id}", response_model=Vulnerability)
def read_vulnerability(
    id: int,
    session: Session = Depends(get_session),
    current_user: str = Depends(get_current_user),
):
    """
    Retrieve a specific vulnerability by its database ID.
    Requires a valid JWT token.
    """
    vulnerability = session.get(Vulnerability, id)
    if not vulnerability:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    return vulnerability


@router.post("/", response_model=Vulnerability)
async def create_vulnerability(
    vulnerability: Vulnerability,
    session: Session = Depends(get_session),
    current_user: str = Depends(get_current_user),
):
    """
    Create a new vulnerability record in the database.
    Requires a valid JWT token.
    """
    session.add(vulnerability)
    session.commit()
    session.refresh(vulnerability)

    await manager.broadcast(json.dumps({
        "id": vulnerability.id,
        "cve_id": vulnerability.cve_id,
        "severity": vulnerability.severity,
        "package_name": vulnerability.package_name,
        "affected_version": vulnerability.affected_version,
        "fixed_version": vulnerability.fixed_version,
        "description": vulnerability.description,
        "detected_at": vulnerability.detected_at.isoformat(),
    }))

    return vulnerability