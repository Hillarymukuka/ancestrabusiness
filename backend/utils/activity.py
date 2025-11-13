from sqlalchemy.orm import Session

from ..models import ActivityLog


def log_activity(db: Session, user_id: int, action: str, description: str) -> None:
    """Record a simple activity entry for audit purposes."""
    log = ActivityLog(user_id=user_id, action=action, description=description)
    db.add(log)
