-- MAVIONIX AI-HRMS ENTERPRISE WORKFORCE EXTENSION DATABASE SCHEMA
-- Version 2.0.0 | PostgreSQL / Supabase Migration

-- 1. EMPLOYEES DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    department VARCHAR(50) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    reporting_manager VARCHAR(100),
    join_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'On Leave', 'Exited'
    base_salary VARCHAR(50),
    bank_account VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ONBOARDING CHECKLISTS TABLE
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(100) NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Identity & Tax', 'IT Provisioning', 'Compliance & NDA', 'Orientation'
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. ATTENDANCE LOGS TABLE (WITH MANAGER OVERRIDE TIMESTAMPS)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_code VARCHAR(20) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    clock_in VARCHAR(20),
    clock_out VARCHAR(20),
    total_hours VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Present', -- 'Present', 'Late', 'On Leave', 'Absent'
    ip_verification VARCHAR(100),
    edited_by_manager BOOLEAN DEFAULT FALSE,
    manager_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name VARCHAR(100) NOT NULL,
    emp_code VARCHAR(20) NOT NULL,
    leave_type VARCHAR(50) NOT NULL, -- 'Annual', 'Sick', 'Casual', 'Maternity/Paternity'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    applied_on DATE DEFAULT CURRENT_DATE,
    action_by_manager VARCHAR(100)
);

-- 5. HR TASKS KANBAN TABLE
CREATE TABLE IF NOT EXISTS hr_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    assignee VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
    due_date DATE,
    status VARCHAR(20) DEFAULT 'To Do', -- 'To Do', 'In Progress', 'Under Review', 'Completed'
    category VARCHAR(50) DEFAULT 'General'
);

-- 6. PERFORMANCE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name VARCHAR(100) NOT NULL,
    emp_code VARCHAR(20) NOT NULL,
    role VARCHAR(100) NOT NULL,
    period VARCHAR(50) NOT NULL,
    technical_score NUMERIC(3,1),
    delivery_score NUMERIC(3,1),
    collaboration_score NUMERIC(3,1),
    overall_rating NUMERIC(3,1),
    ai_summary TEXT,
    status VARCHAR(20) DEFAULT 'Completed'
);

-- 7. PAYROLL REGISTERS TABLE
CREATE TABLE IF NOT EXISTS payroll_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name VARCHAR(100) NOT NULL,
    emp_code VARCHAR(20) NOT NULL,
    month VARCHAR(30) NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL,
    hra NUMERIC(10,2) NOT NULL,
    allowances NUMERIC(10,2) NOT NULL,
    tax_deductions NUMERIC(10,2) NOT NULL,
    net_pay NUMERIC(10,2) NOT NULL,
    bank_account VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Processed'
);

-- 8. DOCUMENT VAULT TABLE
CREATE TABLE IF NOT EXISTS document_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    file_size VARCHAR(20),
    esign_status VARCHAR(30) DEFAULT 'Signed',
    file_path TEXT
);

-- 9. TRAINING COURSES TABLE
CREATE TABLE IF NOT EXISTS training_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    enrolled_staff_count INT DEFAULT 0,
    duration VARCHAR(30),
    completion_pct INT DEFAULT 0
);
