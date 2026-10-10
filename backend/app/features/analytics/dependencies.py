from typing import Annotated

from fastapi import Depends

from app.features.analytics.service import AnalyticsService, get_analytics_service

AnalyticsSvc = Annotated[AnalyticsService, Depends(get_analytics_service)]
