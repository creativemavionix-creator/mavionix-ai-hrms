import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import supabase
from app.auth import _DEMO_USER
from app.routers.jobs import get_job_stats

import asyncio

async def test():
    try:
        print("Testing get_job_stats()...")
        res = await get_job_stats(user=_DEMO_USER)
        print("Success!", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
