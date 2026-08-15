import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import uuid
import os
from typing import BinaryIO, Optional
from app.core.config import settings


class StorageService:
    def __init__(self):
        # MinIO S3 endpoint configuration
        endpoint_url = f"http://{settings.MINIO_ENDPOINT}" if not settings.MINIO_SECURE else f"https://{settings.MINIO_ENDPOINT}"
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.MINIO_ROOT_USER,
            aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1"
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME

    def ensure_bucket_exists(self) -> None:
        """Create the target bucket if it doesn't exist yet."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            except Exception as e:
                print(f"[StorageService] Warning: Could not create bucket: {e}")

    def upload_file(
        self,
        file_obj: BinaryIO,
        original_filename: str,
        content_type: str,
        company_name: Optional[str] = None
    ) -> str:
        """
        Uploads a file object to MinIO and returns the unique s3_key.
        """
        self.ensure_bucket_exists()
        
        file_ext = os.path.splitext(original_filename)[1].lower()
        unique_id = str(uuid.uuid4())
        safe_company = "".join(c for c in (company_name or "general") if c.isalnum() or c in ('-', '_')).strip()
        s3_key = f"{safe_company}/{unique_id}{file_ext}"

        self.s3_client.upload_fileobj(
            file_obj,
            self.bucket_name,
            s3_key,
            ExtraArgs={"ContentType": content_type}
        )
        return s3_key

    def get_presigned_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned download URL for a file."""
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": s3_key},
            ExpiresIn=expires_in
        )

    def delete_file(self, s3_key: str) -> None:
        """Delete an object from MinIO."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        except Exception as e:
            print(f"[StorageService] Error deleting file {s3_key}: {e}")


storage_service = StorageService()
