"use client"

import { useState } from "react"
import { Users, UserPlus, Search, Filter, ShieldCheck, Mail, Phone, Building2, Briefcase, Award, Eye, Edit3, CheckCircle2, MoreVertical, X } from "lucide-react"

interface Employee {
  id: string
  empCode: string
  name: string
  email: string
  phone: string
  department: string
  designation: string
  reportingManager: string
  joinDate: string
  status: "Active" | "On Leave" | "Exited"
  baseSalary: string
  avatar: string
}

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "emp-101",
    empCode: "EMP-101",
    name: "Alexander Frey",
    email: "alexander.frey@mavionix.com",
    phone: "+1 (555) 234-8901",
    department: "Engineering & AI",
    designation: "Lead AI Architect",
    reportingManager: "Elena Rostova (VP Eng)",
    joinDate: "2024-03-15",
    status: "Active",
    baseSalary: "$165,000 / yr",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp-102",
    empCode: "EMP-102",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@mavionix.com",
    phone: "+1 (555) 876-5432",
    department: "Human Resources",
    designation: "HR Operations Manager",
    reportingManager: "Marcus Vance (CHRO)",
    joinDate: "2023-11-01",
    status: "Active",
    baseSalary: "$125,000 / yr",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp-103",
    empCode: "EMP-103",
    name: "David Chen",
    email: "david.chen@mavionix.com",
    phone: "+1 (555) 345-6789",
    department: "Product Design",
    designation: "Sr UI/UX Designer",
    reportingManager: "Sophia Martinez (Design Dir)",
    joinDate: "2024-01-10",
    status: "On Leave",
    baseSalary: "$138,000 / yr",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp-104",
    empCode: "EMP-104",
    name: "Priya Sharma",
    email: "priya.sharma@mavionix.com",
    phone: "+1 (555) 901-2345",
    department: "Engineering & AI",
    designation: "Sr Backend Engineer",
    reportingManager: "Alexander Frey (Lead AI)",
    joinDate: "2026-08-01",
    status: "Active",
    baseSalary: "$150,000 / yr",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  },
]

export default function EmployeeManagementView() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES)
  const [searchQuery, setSearchQuery] = useState("")
  const [deptFilter, setDeptFilter] = useState("All")
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // New Employee Form State
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    phone: "",
    department: "Engineering & AI",
    designation: "",
    reportingManager: "Elena Rostova",
    baseSalary: "$120,000 / yr",
  })

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.empCode.toLowerCase().includes(searchQuery.toLowerCase()) || emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = deptFilter === "All" || emp.department === deptFilter
    return matchesSearch && matchesDept
  })

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmp.name || !newEmp.email) return

    const created: Employee = {
      id: `emp-${Date.now()}`,
      empCode: `EMP-${100 + employees.length + 1}`,
      name: newEmp.name,
      email: newEmp.email,
      phone: newEmp.phone || "+1 (555) 000-1122",
      department: newEmp.department,
      designation: newEmp.designation || "Software Specialist",
      reportingManager: newEmp.reportingManager,
      joinDate: new Date().toISOString().split("T")[0],
      status: "Active",
      baseSalary: newEmp.baseSalary,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    }

    setEmployees([created, ...employees])
    setIsAddModalOpen(false)
    setNewEmp({ name: "", email: "", phone: "", department: "Engineering & AI", designation: "", reportingManager: "Elena Rostova", baseSalary: "$120,000 / yr" })
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Core</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Employee Directory <span className="text-gradient">& Profile Management</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Manage organizational hierarchy, department allocations, and employee dossiers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4 text-white" />
          <span>+ Register New Employee</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glass p-4 rounded-xl border border-white/10">
          <span className="eyebrow text-[10px] font-mono uppercase text-white/60">TOTAL HEADCOUNT</span>
          <div className="stat-number text-2xl font-bold font-display text-white mt-1">{employees.length} Staff</div>
          <span className="text-[10px] font-mono text-emerald-400 mt-1 block">✓ 100% Accounted</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10">
          <span className="eyebrow text-[10px] font-mono uppercase text-white/60">ACTIVE STAFF</span>
          <div className="stat-number text-2xl font-bold font-display text-emerald-400 mt-1">
            {employees.filter((e) => e.status === "Active").length} Active
          </div>
          <span className="text-[10px] font-mono text-white/50 mt-1 block">Full Workstation Access</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10">
          <span className="eyebrow text-[10px] font-mono uppercase text-white/60">ON LEAVE</span>
          <div className="stat-number text-2xl font-bold font-display text-amber-400 mt-1">
            {employees.filter((e) => e.status === "On Leave").length} Staff
          </div>
          <span className="text-[10px] font-mono text-amber-400/80 mt-1 block">Approved Leave Window</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10">
          <span className="eyebrow text-[10px] font-mono uppercase text-white/60">DEPARTMENTS</span>
          <div className="stat-number text-2xl font-bold font-display text-signal mt-1">4 Active Teams</div>
          <span className="text-[10px] font-mono text-white/50 mt-1 block">Engineering, HR, Design, Sales</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-glass p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-signal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs font-mono text-white/60 uppercase">Filter Dept:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-signal"
          >
            <option value="All">All Departments</option>
            <option value="Engineering & AI">Engineering & AI</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Product Design">Product Design</option>
          </select>
        </div>
      </div>

      {/* Employee Directory Table */}
      <div className="card-glass rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-black/40 text-white/60 border-b border-white/10 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Reporting Manager</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover border border-white/20" />
                      <div>
                        <div className="font-bold text-white font-display text-sm">{emp.name}</div>
                        <div className="text-[11px] text-white/50">{emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-signal">{emp.empCode}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                      {emp.department}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-white/70">{emp.reportingManager}</td>
                  <td className="py-3.5 px-4 text-white/50">{emp.joinDate}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        emp.status === "Active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : emp.status === "On Leave"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedEmp(emp)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-[11px] transition-colors"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-signal" /> Register New Employee
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="elena@mavionix.com"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Department</label>
                  <select
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  >
                    <option value="Engineering & AI">Engineering & AI</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Product Design">Product Design</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="AI Engineer"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Base Compensation</label>
                <input
                  type="text"
                  placeholder="$130,000 / yr"
                  value={newEmp.baseSalary}
                  onChange={(e) => setNewEmp({ ...newEmp, baseSalary: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-white rounded-xl text-xs uppercase font-bold">
                  Save & Issue Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Detail Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-lg w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <img src={selectedEmp.avatar} alt={selectedEmp.name} className="w-12 h-12 rounded-full object-cover border-2 border-signal" />
                <div>
                  <h3 className="text-lg font-bold text-white font-display">{selectedEmp.name}</h3>
                  <p className="text-xs text-signal font-bold">{selectedEmp.empCode} • {selectedEmp.designation}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
                <span className="text-white/40 uppercase text-[10px] block">DEPARTMENT</span>
                <span className="text-white font-bold">{selectedEmp.department}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
                <span className="text-white/40 uppercase text-[10px] block">REPORTING MANAGER</span>
                <span className="text-white font-bold">{selectedEmp.reportingManager}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
                <span className="text-white/40 uppercase text-[10px] block">WORK EMAIL</span>
                <span className="text-emerald-400 font-bold text-[11px] truncate block">{selectedEmp.email}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
                <span className="text-white/40 uppercase text-[10px] block">COMPENSATION</span>
                <span className="text-white font-bold">{selectedEmp.baseSalary}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedEmp(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase">
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
