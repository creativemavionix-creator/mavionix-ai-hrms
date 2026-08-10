"use client"

import { useState } from "react"
import { CheckSquare, Plus, Clock, User, AlertCircle, ChevronRight, X } from "lucide-react"

interface HRTask {
  id: string
  title: string
  assignee: string
  priority: "High" | "Medium" | "Low"
  dueDate: string
  status: "To Do" | "In Progress" | "Under Review" | "Completed"
  category: "Recruitment" | "Payroll" | "Compliance" | "General"
}

const INITIAL_TASKS: HRTask[] = [
  { id: "tsk-1", title: "Review Senior Backend Engineer AI Interview Transcripts", assignee: "Sarah Jenkins", priority: "High", dueDate: "2026-08-11", status: "To Do", category: "Recruitment" },
  { id: "tsk-2", title: "Process August Monthly Payroll Deductions & Tax Forms", assignee: "Alexander Frey", priority: "High", dueDate: "2026-08-12", status: "In Progress", category: "Payroll" },
  { id: "tsk-3", title: "Audit Annual Employee NDA Cryptographic Signatures", assignee: "David Chen", priority: "Medium", dueDate: "2026-08-15", status: "Under Review", category: "Compliance" },
  { id: "tsk-4", title: "Finalize AI Blueprint for Lead Product Designer Role", assignee: "Priya Sharma", priority: "Low", dueDate: "2026-08-18", status: "Completed", category: "Recruitment" },
]

export default function TaskManagementView() {
  const [tasks, setTasks] = useState<HRTask[]>(INITIAL_TASKS)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Form State
  const [newTask, setNewTask] = useState({
    title: "",
    assignee: "Sarah Jenkins",
    priority: "Medium" as HRTask["priority"],
    dueDate: "",
    category: "General" as HRTask["category"],
  })

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title) return

    const created: HRTask = {
      id: `tsk-${Date.now()}`,
      title: newTask.title,
      assignee: newTask.assignee,
      priority: newTask.priority,
      dueDate: newTask.dueDate || new Date().toISOString().split("T")[0],
      status: "To Do",
      category: newTask.category,
    }

    setTasks([...tasks, created])
    setIsAddModalOpen(false)
    setNewTask({ title: "", assignee: "Sarah Jenkins", priority: "Medium", dueDate: "", category: "General" })
  }

  const moveTask = (id: string, newStatus: HRTask["status"]) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)))
  }

  const COLUMNS: HRTask["status"][] = ["To Do", "In Progress", "Under Review", "Completed"]

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Task Engine</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Task & Project <span className="text-gradient">Kanban Board</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Internal HR task assignment, priority tagging, and workflow tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ Create HR Task</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((colStatus) => {
          const colTasks = tasks.filter((t) => t.status === colStatus)

          return (
            <div key={colStatus} className="card-glass p-4 rounded-xl border border-white/10 space-y-3 min-h-[420px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-xs text-white uppercase font-display tracking-wider">{colStatus}</span>
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white font-bold">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {colTasks.map((task) => (
                  <div key={task.id} className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase">{task.category}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          task.priority === "High"
                            ? "bg-red-500/20 text-red-300"
                            : task.priority === "Medium"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>

                    <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/5">
                      <span>👤 {task.assignee}</span>
                      <span>📅 {task.dueDate}</span>
                    </div>

                    {/* Move Stage Controls */}
                    <div className="pt-1 flex gap-1 justify-end text-[10px]">
                      {colStatus !== "To Do" && (
                        <button
                          onClick={() => moveTask(task.id, COLUMNS[COLUMNS.indexOf(colStatus) - 1])}
                          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded"
                        >
                          ←
                        </button>
                      )}
                      {colStatus !== "Completed" && (
                        <button
                          onClick={() => moveTask(task.id, COLUMNS[COLUMNS.indexOf(colStatus) + 1])}
                          className="px-2 py-0.5 bg-signal/30 hover:bg-signal/50 text-white rounded font-bold"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-signal" /> Create HR Task
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Employee NDA Contracts"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value as any })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  >
                    <option value="Recruitment">Recruitment</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Compliance">Compliance</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
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
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
