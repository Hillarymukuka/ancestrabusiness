import mimetypes
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import auth, config, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])

ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}


def get_or_initialize_receipt_settings(db: Session) -> models.ReceiptSettings:
    settings = db.query(models.ReceiptSettings).first()
    if settings:
        return settings
    settings = models.ReceiptSettings()
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def serialize_receipt_settings(settings: models.ReceiptSettings) -> schemas.ReceiptSettingsRead:
    return schemas.ReceiptSettingsRead(
        company_name=settings.company_name,
        company_address=settings.company_address,
        company_logo_url=settings.company_logo_url,
        company_tagline=settings.company_tagline,
        footer_message=settings.footer_message,
        updated_at=settings.updated_at,
    )


@router.get("/receipt", response_model=schemas.ReceiptSettingsRead)
def read_receipt_settings(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    settings = get_or_initialize_receipt_settings(db)
    return serialize_receipt_settings(settings)


@router.put("/receipt", response_model=schemas.ReceiptSettingsRead)
def update_receipt_settings(
    payload: schemas.ReceiptSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    if current_user.role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can update receipt settings")

    settings = get_or_initialize_receipt_settings(db)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(settings, field, value)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return serialize_receipt_settings(settings)


@router.post("/receipt/logo", response_model=schemas.ReceiptSettingsRead)
async def upload_receipt_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    if current_user.role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can update receipt settings")

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type)
    if not extension:
        guessed_extension = mimetypes.guess_extension(file.content_type or "")
        if guessed_extension in {".png", ".jpg", ".jpeg", ".webp", ".svg"}:
            extension = guessed_extension
        else:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported image type. Upload PNG, JPG, WEBP, or SVG files.",
            )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    filename = f"{uuid4().hex}{extension}"
    destination = config.MEDIA_RECEIPT_DIR / filename
    destination.write_bytes(content)

    settings = get_or_initialize_receipt_settings(db)
    previous_logo = settings.company_logo_url or ""
    if previous_logo.startswith(f"{config.MEDIA_URL}/logos/"):
        relative_old_path = previous_logo.replace(config.MEDIA_URL, "", 1).lstrip("/\\")
        old_path = config.MEDIA_ROOT / relative_old_path
        if old_path.exists() and old_path.is_file():
            old_path.unlink()

    settings.company_logo_url = f"{config.MEDIA_URL}/logos/{filename}"
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return serialize_receipt_settings(settings)
