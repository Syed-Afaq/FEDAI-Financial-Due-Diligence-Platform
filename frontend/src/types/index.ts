export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'failed';

export interface DocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  s3_key: string;
  status: DocumentStatus;
  company_name: string;
  error_message?: string | null;
  uploaded_at: string;
  updated_at: string;
}

export interface UploadResponse {
  message: string;
  document: DocumentItem;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}