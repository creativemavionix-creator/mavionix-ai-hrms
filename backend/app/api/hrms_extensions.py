from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/hrms", tags=["HRMS Extensions"])

# Pydantic Schemas
class EmployeeCreate(BaseModel):
    emp_code: str
    name: str
    email: str
    phone: Optional[str] = None
    department: str
    designation: str
    reporting_manager: str
    base_salary: str

class TimecardOverride(BaseModel):
    clock_in: str
    clock_out: str
    total_hours: str
    status: str
    manager_notes: Optional[str] = None

class LeaveApply(BaseModel):
    employee_name: str
    emp_code: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class TaskCreate(BaseModel):
    title: str
    assignee: str
    priority: str
    due_date: str
    category: str

# In-Memory DB Stores (Fallback when Supabase DB is disconnected)
IN_MEMORY_EMPLOYEES = [
    {
        "id": "emp-101",
        "emp_code": "EMP-101",
        "name": "Alexander Frey",
        "email": "alexander.frey@mavionix.com",
        "department": "Engineering & AI",
        "designation": "Lead AI Architect",
        "reporting_manager": "Elena Rostova",
        "status": "Active",
        "base_salary": "$165,000 / yr"
    },
    {
        "id": "emp-102",
        "emp_code": "EMP-102",
        "name": "Sarah Jenkins",
        "email": "sarah.jenkins@mavionix.com",
        "department": "Human Resources",
        "designation": "HR Operations Manager",
        "reporting_manager": "Marcus Vance",
        "status": "Active",
        "base_salary": "$125,000 / yr"
    }
]

IN_MEMORY_ATTENDANCE = [
    {
        "id": "att-1",
        "employeeName": "Alexander Frey",
        "empCode": "EMP-101",
        "date": "2026-08-10",
        "clockIn": "08:55 AM",
        "clockOut": "06:02 PM",
        "totalHours": "9h 07m",
        "status": "Present",
        "ipVerification": "Verified (192.168.1.45)",
        "editedByManager": False
    }
]

IN_MEMORY_LEAVES = [
    {
        "id": "lv-101",
        "employeeName": "David Chen",
        "empCode": "EMP-103",
        "leaveType": "Annual",
        "startDate": "2026-08-10",
        "endDate": "2026-08-14",
        "daysCount": 5,
        "reason": "Personal family vacation & rest",
        "status": "Approved"
    }
]

IN_MEMORY_TASKS = [
    {
        "id": "tsk-1",
        "title": "Review Senior Backend Engineer AI Interview Transcripts",
        "assignee": "Sarah Jenkins",
        "priority": "High",
        "dueDate": "2026-08-11",
        "status": "To Do",
        "category": "Recruitment"
    }
]

# 1. EMPLOYEES API
@router.get("/employees")
def get_employees():
    return {"status": "success", "data": IN_MEMORY_EMPLOYEES}

@router.post("/employees")
def create_employee(emp: EmployeeCreate):
    new_emp = {
        "id": f"emp-{len(IN_MEMORY_EMPLOYEES) + 101}",
        "emp_code": emp.emp_code,
        "name": emp.name,
        "email": emp.email,
        "department": emp.department,
        "designation": emp.designation,
        "reporting_manager": emp.reporting_manager,
        "status": "Active",
        "base_salary": emp.base_salary
    }
    IN_MEMORY_EMPLOYEES.append(new_emp)
    return {"status": "success", "message": "Employee registered successfully", "data": new_emp}

# 2. ATTENDANCE & MANAGER OVERRIDE API
@router.get("/attendance")
def get_attendance():
    return {"status": "success", "data": IN_MEMORY_ATTENDANCE}

@router.put("/attendance/{record_id}/override")
def override_timecard(record_id: str, payload: TimecardOverride):
    for rec in IN_MEMORY_ATTENDANCE:
        if rec["id"] == record_id:
            rec["clockIn"] = payload.clock_in
            rec["clockOut"] = payload.clock_out
            rec["totalHours"] = payload.total_hours
            rec["status"] = payload.status
            rec["editedByManager"] = True
            rec["ipVerification"] = f"Manager Override ({payload.manager_notes or 'Adjustment'})"
            return {"status": "success", "message": "Timecard override saved", "data": rec}
    raise HTTPException(status_code=404, detail="Attendance record not found")

# 3. LEAVE MANAGEMENT API
@router.get("/leave")
def get_leave_requests():
    return {"status": "success", "data": IN_MEMORY_LEAVES}

@router.post("/leave")
def apply_leave(payload: LeaveApply):
    new_leave = {
        "id": f"lv-{len(IN_MEMORY_LEAVES) + 101}",
        "employeeName": payload.employee_name,
        "empCode": payload.emp_code,
        "leaveType": payload.leave_type,
        "startDate": payload.start_date,
        "endDate": payload.end_date,
        "daysCount": 3,
        "reason": payload.reason,
        "status": "Pending"
    }
    IN_MEMORY_LEAVES.append(new_leave)
    return {"status": "success", "message": "Leave application submitted", "data": new_leave}

@router.put("/leave/{leave_id}/status")
def update_leave_status(leave_id: str, status: str = Query(...)):
    for lv in IN_MEMORY_LEAVES:
        if lv["id"] == leave_id:
            lv["status"] = status
            return {"status": "success", "message": f"Leave status updated to {status}", "data": lv}
    raise HTTPException(status_code=404, detail="Leave request not found")

# 4. HR TASKS KANBAN API
@router.get("/tasks")
def get_tasks():
    return {"status": "success", "data": IN_MEMORY_TASKS}

@router.post("/tasks")
def create_task(payload: TaskCreate):
    new_task = {
        "id": f"tsk-{len(IN_MEMORY_TASKS) + 1}",
        "title": payload.title,
        "assignee": payload.assignee,
        "priority": payload.priority,
        "dueDate": payload.due_date,
        "status": "To Do",
        "category": payload.category
    }
    IN_MEMORY_TASKS.append(new_task)
    return {"status": "success", "message": "Task created", "data": new_task}

@router.put("/tasks/{task_id}/status")
def update_task_status(task_id: str, status: str = Query(...)):
    for t in IN_MEMORY_TASKS:
        if t["id"] == task_id:
            t["status"] = status
            return {"status": "success", "message": f"Task status moved to {status}", "data": t}
    raise HTTPException(status_code=404, detail="Task not found")
