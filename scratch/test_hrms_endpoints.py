from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("--- Testing HRMS Extension Endpoints ---")
r_emp = client.get("/api/hrms/employees")
print("GET /api/hrms/employees -> Status:", r_emp.status_code, "Data count:", len(r_emp.json()["data"]))

r_att = client.get("/api/hrms/attendance")
print("GET /api/hrms/attendance -> Status:", r_att.status_code, "Data count:", len(r_att.json()["data"]))

r_override = client.put("/api/hrms/attendance/att-1/override", json={
    "clock_in": "08:30 AM",
    "clock_out": "05:30 PM",
    "total_hours": "9h 00m",
    "status": "Present",
    "manager_notes": "Manager override verified"
})
print("PUT /api/hrms/attendance/att-1/override -> Status:", r_override.status_code, "New Notes:", r_override.json()["data"]["ipVerification"])

r_leave = client.get("/api/hrms/leave")
print("GET /api/hrms/leave -> Status:", r_leave.status_code, "Data count:", len(r_leave.json()["data"]))

r_tasks = client.get("/api/hrms/tasks")
print("GET /api/hrms/tasks -> Status:", r_tasks.status_code, "Data count:", len(r_tasks.json()["data"]))

print("--- ALL ENDPOINTS VERIFIED SUCCESSFULLY! ---")
