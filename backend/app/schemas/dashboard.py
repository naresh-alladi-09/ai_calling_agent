from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class StatusCountItem(BaseModel):
    name: str
    count: int
    percentage: float


class DailyCallTrend(BaseModel):
    date: str
    calls_attempted: int
    calls_connected: int
    demos_booked: int
    cost_inr: float


class DashboardMetricsOut(BaseModel):
    total_leads: int
    calls_attempted: int
    calls_connected: int
    connection_rate: float
    interested_prospects: int
    demo_requests: int
    demo_conversion_rate: float
    callbacks_scheduled: int
    not_interested_prospects: int
    opt_out_requests: int
    total_call_duration_seconds: int
    estimated_expenditure_inr: float
    calling_mode: str
    outcomes_distribution: List[StatusCountItem]
    language_distribution: List[StatusCountItem]
    daily_trends: List[DailyCallTrend]
