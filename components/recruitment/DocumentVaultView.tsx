"use client"

import { useState } from "react"
import { Folder, Upload, ShieldCheck, FileText, Lock, Download, CheckCircle2, Search, Plus, X } from "lucide-react"

interface DocumentItem {
  id: string
  title: string
  category: "Employment Contract" | "NDA & Security" | "Tax Compliance" | "Company Policy"
  employeeName: string
  uploadDate: string
  fileSize: string
  eSignStatus: "Signed" | "Pending Signature" | "Expired"
}

const INITIAL_DOCS: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Master Employment Agreement (Priya Sharma)",
    category: "Employment Contract",
    employeeName: "Priya Sharma",
    uploadDate: "2026-08-01",
    fileSize: "1.4 MB",
    eSignStatus: "Signed",
  },
  {
    id: "doc-2",
    title: "Mutual Confidentiality & NDA Agreement",
    category: "NDA & Security",
    employeeName: "Alexander Frey",
    uploadDate: "2026-03-15",
    fileSize: "850 KB",
    eSignStatus: "Signed",
  },
  {
    id: "doc-3",
    title: "W-4 Federal Tax Withholding Certificate",
    category: "Tax Compliance",
    employeeName: "Sarah Jenkins",
    uploadDate: "2026-07-20",
    fileSize: "620 KB",
    eSignStatus: "Signed",
  },
  {
    id: "doc-4",
    title: "MaVionix AI Security & Code of Conduct Policy 2026",
    category: "Company Policy",
    employeeName: "All Staff",
    uploadDate: "2026-01-01",
    fileSize: "2.8 MB",
    eSignStatus: "Signed",
  },
]

export default function DocumentVaultView() {
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <Folder className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Compliance Repository</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Document Vault <span className="text-gradient">& E-Sign Repository</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Secure cloud document storage for employment contracts, NDAs, and tax compliance
            </p>
          </div>
        </div>

        <button className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer">
          <Upload className="w-4 h-4 text-white" />
          <span>+ Upload Document</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="card-glass p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-signal"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Lock className="w-3.5 h-3.5" /> 256-Bit Encrypted Storage
          </span>
        </div>
      </div>

      {/* Document Table */}
      <div className="card-glass rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-white/60 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Associated Staff</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">E-Sign Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white font-display flex items-center gap-2">
                    <FileText className="w-4 h-4 text-signal shrink-0" />
                    {doc.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 text-[10px] uppercase font-bold">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-white/70">{doc.employeeName}</td>
                  <td className="py-3.5 px-4 text-white/50">{doc.uploadDate}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> {doc.eSignStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Downloading ${doc.title}...`)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 ml-auto"
                    >
                      <Download className="w-3 h-3 text-signal" /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
