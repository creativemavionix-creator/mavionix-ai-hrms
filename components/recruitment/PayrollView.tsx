"use client"

import { useState } from "react"
import { DollarSign, Download, Printer, CheckCircle2, Building, CreditCard, ShieldCheck, Eye, X } from "lucide-react"

interface PayrollRecord {
  id: string
  employeeName: string
  empCode: string
  role: string
  month: string
  baseSalary: number
  hra: number
  allowances: number
  taxDeductions: number
  netPay: number
  status: "Processed" | "Pending"
  bankAccount: string
}

const PAYROLL_DATA: PayrollRecord[] = [
  {
    id: "pay-101",
    employeeName: "Alexander Frey",
    empCode: "EMP-101",
    role: "Lead AI Architect",
    month: "August 2026",
    baseSalary: 10000,
    hra: 4000,
    allowances: 1500,
    taxDeductions: 2200,
    netPay: 13300,
    status: "Processed",
    bankAccount: "CHASE •••• 8891",
  },
  {
    id: "pay-102",
    employeeName: "Sarah Jenkins",
    empCode: "EMP-102",
    role: "HR Operations Manager",
    month: "August 2026",
    baseSalary: 7500,
    hra: 3000,
    allowances: 1000,
    taxDeductions: 1600,
    netPay: 9900,
    status: "Processed",
    bankAccount: "BOA •••• 4421",
  },
  {
    id: "pay-103",
    employeeName: "Priya Sharma",
    empCode: "EMP-104",
    role: "Sr Backend Engineer",
    month: "August 2026",
    baseSalary: 9000,
    hra: 3600,
    allowances: 1200,
    taxDeductions: 1900,
    netPay: 11900,
    status: "Processed",
    bankAccount: "WELLS •••• 9012",
  },
]

export default function PayrollView() {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(PAYROLL_DATA)
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null)

  const totalPayrollOutflow = payrolls.reduce((sum, item) => sum + item.netPay, 0)

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Payroll Engine</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Payroll Processing <span className="text-gradient">& Payslip Generator</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Salary breakdowns, attendance-integrated calculations, and downloadable PDF payslips
            </p>
          </div>
        </div>

        <button className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer">
          <CreditCard className="w-4 h-4 text-white" />
          <span>Execute Monthly Payroll</span>
        </button>
      </div>

      {/* Payroll Outflow Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-glass p-4 rounded-xl border border-white/10 space-y-1">
          <span className="eyebrow text-[10px] text-white/50 uppercase">AUGUST NET OUTFLOW</span>
          <div className="text-2xl font-bold font-display text-emerald-400">${totalPayrollOutflow.toLocaleString()} USD</div>
          <span className="text-[10px] text-emerald-400/80 block">✓ Processed & Disbursed</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10 space-y-1">
          <span className="eyebrow text-[10px] text-white/50 uppercase">TOTAL TAX WITHHELD</span>
          <div className="text-2xl font-bold font-display text-white">$5,700 USD</div>
          <span className="text-[10px] text-white/50 block">Federal & State Compliance</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10 space-y-1">
          <span className="eyebrow text-[10px] text-white/50 uppercase">EMPLOYEES PAID</span>
          <div className="text-2xl font-bold font-display text-signal">3 / 3 Active</div>
          <span className="text-[10px] text-white/50 block">100% Disbursed</span>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="card-glass rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">MONTHLY PAYROLL REGISTER — AUGUST 2026</h2>
          <span className="text-[10px] text-emerald-400 font-bold">● DISBURSED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-white/60 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Base Salary</th>
                <th className="py-3 px-4">HRA (40%)</th>
                <th className="py-3 px-4">Allowances</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Disbursed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {payrolls.map((pay) => (
                <tr key={pay.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white font-display">{pay.employeeName}</div>
                    <div className="text-[10px] text-signal">{pay.role} • {pay.bankAccount}</div>
                  </td>
                  <td className="py-3.5 px-4 text-white/80">${pay.baseSalary.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-white/80">${pay.hra.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-white/80">${pay.allowances.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-red-400">-${pay.taxDeductions.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400 font-display text-sm">
                    ${pay.netPay.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedPayslip(pay)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5 text-signal" /> View Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-lg w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">OFFICIAL PAYSLIP</h3>
                <p className="text-xs text-signal">MaVionix AI-HRMS • {selectedPayslip.month}</p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Employee Name:</span>
                <span className="text-white font-bold">{selectedPayslip.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Employee Code:</span>
                <span className="text-signal font-bold">{selectedPayslip.empCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Disbursement Account:</span>
                <span className="text-white">{selectedPayslip.bankAccount}</span>
              </div>
            </div>

            {/* Salary Components Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Base Basic Salary</span>
                <span className="text-white">${selectedPayslip.baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">House Rent Allowance (HRA)</span>
                <span className="text-white">${selectedPayslip.hra.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/70">Special Allowances</span>
                <span className="text-white">${selectedPayslip.allowances.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5 text-red-400">
                <span>Income Tax & Deductions</span>
                <span>-${selectedPayslip.taxDeductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm border-t border-white/10 text-emerald-400">
                <span>NET SALARY PAYOUT</span>
                <span>${selectedPayslip.netPay.toLocaleString()} USD</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => alert("Printing official payslip PDF...")}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
              <button onClick={() => setSelectedPayslip(null)} className="btn-primary px-5 py-2 text-white rounded-xl text-xs uppercase font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
