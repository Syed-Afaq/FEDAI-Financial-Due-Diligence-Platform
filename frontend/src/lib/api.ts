import { DocumentItem, UploadResponse, HealthResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to reach backend API');
  }
  return res.json();
}

export async function fetchDocuments(
  companyName?: string,
  statusFilter?: string
): Promise<DocumentItem[]> {
  const params = new URLSearchParams();
  if (companyName) params.append('company_name', companyName);
  if (statusFilter) params.append('status_filter', statusFilter);

  const url = `${API_BASE}/api/v1/documents${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch documents');
  }
  return res.json();
}

export async function uploadDocument(
  file: File,
  companyName?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (companyName) {
    formData.append('company_name', companyName);
  }

  const res = await fetch(`${API_BASE}/api/v1/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = 'Upload failed';
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = `Server responded with status ${res.status}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export async function getDocumentDownloadUrl(
  documentId: string
): Promise<{ download_url: string; filename: string }> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}/download`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to retrieve document download URL');
  }
  return res.json();
}

export async function deleteDocument(documentId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete document');
  }
  return res.json();
}