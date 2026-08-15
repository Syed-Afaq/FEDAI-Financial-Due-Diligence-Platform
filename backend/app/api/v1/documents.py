from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import io

from app.db.database import get_db
from app.db.models import Document, DocumentStatus
from app.services.storage_service import storage_service

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".xlsx", ".xls", ".csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a financial document (PDF, Excel, CSV) to MinIO and register in database.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read and validate file size
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of 50MB (size: {file_size / (1024 * 1024):.1f}MB)."
        )

    # Upload to MinIO
    try:
        file_obj = io.BytesIO(contents)
        s3_key = storage_service.upload_file(
            file_obj=file_obj,
            original_filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            company_name=company_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload failed: {str(e)}"
        )

    # Save to PostgreSQL database
    doc = Document(
        filename=os.path.basename(s3_key),
        original_filename=file.filename,
        file_type=ext.lstrip("."),
        file_size=file_size,
        s3_key=s3_key,
        status=DocumentStatus.PENDING.value,
        company_name=company_name or "General"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "message": "Document uploaded successfully",
        "document": doc.to_dict()
    }


@router.get("")
def list_documents(
    company_name: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all uploaded documents with optional filtering.
    """
    query = db.query(Document)
    if company_name:
        query = query.filter(Document.company_name.ilike(f"%{company_name}%"))
    if status_filter:
        query = query.filter(Document.status == status_filter)
    
    docs = query.order_by(Document.uploaded_at.desc()).all()
    return [doc.to_dict() for doc in docs]


@router.get("/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    """
    Get metadata and status of a specific document.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return doc.to_dict()


@router.get("/{document_id}/download")
def get_download_url(document_id: str, db: Session = Depends(get_db)):
    """
    Generate a presigned download URL for the document.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    url = storage_service.get_presigned_url(doc.s3_key)
    return {"download_url": url, "filename": doc.original_filename}


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """
    Delete a document from PostgreSQL and MinIO storage.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    # Remove from MinIO
    storage_service.delete_file(doc.s3_key)
    # Remove from DB
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
