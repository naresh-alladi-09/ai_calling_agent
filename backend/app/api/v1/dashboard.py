from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.lead import CollegeLead
from app.models.call import CallRecord
from app.models.demo import DemoBooking
from app.models.compliance import SuppressionRecord
from app.models.settings import ApplicationSettings
from app.models.user import User
from app.schemas.dashboard import DashboardMetricsOut, StatusCountItem, DailyCallTrend
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])


@router.get("/metrics", response_model=DashboardMetricsOut)
def get_dashboard_metrics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compute real-time CRM and sales calling analytics.
    """
    total_leads = db.query(CollegeLead).count()

    # Calls summary
    total_calls_attempted = db.query(CallRecord).count()
    connected_calls = db.query(CallRecord).filter(
        CallRecord.status.in_(["completed", "in_progress"])
    ).count()

    connection_rate = (connected_calls / total_calls_attempted * 100.0) if total_calls_attempted > 0 else 0.0

    # Prospect outcomes
    interested_count = db.query(CallRecord).filter(CallRecord.outcome == "interested").count()
    demo_requests_count = db.query(DemoBooking).count()
    demo_conversion_rate = (demo_requests_count / connected_calls * 100.0) if connected_calls > 0 else 0.0
    callbacks_count = db.query(CallRecord).filter(CallRecord.outcome == "callback_requested").count()
    not_interested_count = db.query(CallRecord).filter(CallRecord.outcome == "not_interested").count()
    opt_outs_count = db.query(SuppressionRecord).filter(SuppressionRecord.is_active == True).count()

    # Durations and Expenditure
    duration_sum = db.query(func.sum(CallRecord.duration_seconds)).scalar() or 0
    cost_sum = db.query(func.sum(CallRecord.cost_inr)).scalar() or 0.0

    # Mode
    settings = db.query(ApplicationSettings).first()
    calling_mode = settings.calling_mode if settings else "demo"

    # Outcome distribution
    outcome_rows = db.query(
        CallRecord.outcome, func.count(CallRecord.id)
    ).group_by(CallRecord.outcome).all()

    outcomes_distribution = []
    total_outcomes = sum(count for outcome, count in outcome_rows if outcome)
    for outcome, count in outcome_rows:
        if outcome:
            pct = (count / total_outcomes * 100.0) if total_outcomes > 0 else 0.0
            outcomes_distribution.append(StatusCountItem(name=outcome, count=count, percentage=round(pct, 1)))

    # Language distribution
    lang_rows = db.query(
        CallRecord.language_used, func.count(CallRecord.id)
    ).group_by(CallRecord.language_used).all()

    language_distribution = []
    total_langs = sum(count for lang, count in lang_rows if lang)
    for lang, count in lang_rows:
        if lang:
            pct = (count / total_langs * 100.0) if total_langs > 0 else 0.0
            language_distribution.append(StatusCountItem(name=lang, count=count, percentage=round(pct, 1)))

    # Daily trends (last 7 days)
    daily_trends = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        date_str = target_date.strftime("%Y-%m-%d")
        day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)

        attempted = db.query(CallRecord).filter(
            CallRecord.created_at >= day_start,
            CallRecord.created_at <= day_end
        ).count()

        connected = db.query(CallRecord).filter(
            CallRecord.created_at >= day_start,
            CallRecord.created_at <= day_end,
            CallRecord.status.in_(["completed", "in_progress"])
        ).count()

        demos = db.query(DemoBooking).filter(
            DemoBooking.created_at >= day_start,
            DemoBooking.created_at <= day_end
        ).count()

        cost = db.query(func.sum(CallRecord.cost_inr)).filter(
            CallRecord.created_at >= day_start,
            CallRecord.created_at <= day_end
        ).scalar() or 0.0

        daily_trends.append(DailyCallTrend(
            date=date_str,
            calls_attempted=attempted,
            calls_connected=connected,
            demos_booked=demos,
            cost_inr=round(float(cost), 2)
        ))

    return DashboardMetricsOut(
        total_leads=total_leads,
        calls_attempted=total_calls_attempted,
        calls_connected=connected_calls,
        connection_rate=round(connection_rate, 1),
        interested_prospects=interested_count,
        demo_requests=demo_requests_count,
        demo_conversion_rate=round(demo_conversion_rate, 1),
        callbacks_scheduled=callbacks_count,
        not_interested_prospects=not_interested_count,
        opt_out_requests=opt_outs_count,
        total_call_duration_seconds=int(duration_sum),
        estimated_expenditure_inr=round(float(cost_sum), 2),
        calling_mode=calling_mode,
        outcomes_distribution=outcomes_distribution,
        language_distribution=language_distribution,
        daily_trends=daily_trends
    )
