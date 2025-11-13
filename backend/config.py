import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / "uploads"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
MEDIA_URL = "/media"
MEDIA_RECEIPT_DIR = MEDIA_ROOT / "logos"
MEDIA_RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_EXPENSE_RECEIPTS_DIR = MEDIA_ROOT / "expense_receipts"
MEDIA_EXPENSE_RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)
