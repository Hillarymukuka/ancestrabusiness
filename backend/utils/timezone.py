from datetime import datetime, timezone, timedelta

# Central Africa Time (CAT) - UTC+2
CAT_TIMEZONE = timezone(timedelta(hours=2))

def now_cat():
    """Get current time in Central Africa Time (CAT)"""
    return datetime.now(CAT_TIMEZONE)

def utc_to_cat(utc_dt):
    """Convert UTC datetime to CAT timezone"""
    if utc_dt.tzinfo is None:
        # Assume UTC if no timezone info
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(CAT_TIMEZONE)

def format_cat_time(dt, format_str="%d %b %Y at %H:%M CAT"):
    """Format datetime in CAT timezone"""
    if dt.tzinfo is None:
        # Assume UTC if no timezone info
        dt = dt.replace(tzinfo=timezone.utc)
    cat_time = dt.astimezone(CAT_TIMEZONE)
    return cat_time.strftime(format_str)