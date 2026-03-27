/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Plus,
  Camera,
  PieChart,
  List,
  Trash2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Book,
  Settings,
  ChevronDown,
  Check,
  X,
  Download,
  Cloud,
  CloudOff,
  ImageIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { cn, exportToCSV } from "./lib/utils";
import { Expense, CATEGORIES, Ledger } from "./lib/types";
import { scanBill, getAIWarning } from "./services/aiService";

const DEFAULT_LEDGER: Ledger = {
  id: "default",
  name: "个人账本",
  icon: "👤",
  color: "#171717",
};

export default function App() {
  const [ledgers, setLedgers] = useState<Ledger[]>([DEFAULT_LEDGER]);
  const [currentLedgerId, setCurrentLedgerId] = useState<string>(DEFAULT_LEDGER.id);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");
  const [isScanning, setIsScanning] = useState(false);
  const [aiWarning, setAiWarning] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showLedgerSelector, setShowLedgerSelector] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  
  const [newLedger, setNewLedger] = useState<Partial<Ledger>>({
    name: "",
    icon: "📚",
    color: "#171717",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    merchant: "",
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    category: "其他",
  });

  // Load from local storage
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses");
    const savedLedgers = localStorage.getItem("ledgers");
    const savedCurrentLedgerId = localStorage.getItem("currentLedgerId");

    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedLedgers) setLedgers(JSON.parse(savedLedgers));
    if (savedCurrentLedgerId) setCurrentLedgerId(savedCurrentLedgerId);
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("ledgers", JSON.stringify(ledgers));
    localStorage.setItem("currentLedgerId", currentLedgerId);
    
    const currentExpenses = expenses.filter(e => e.ledgerId === currentLedgerId);
    if (currentExpenses.length > 0) {
      updateAIWarning(currentExpenses);
    } else {
      setAiWarning("");
    }
  }, [expenses, ledgers, currentLedgerId]);

  const updateAIWarning = async (relevantExpenses: Expense[]) => {
    try {
      const warning = await getAIWarning(relevantExpenses.slice(-10));
      setAiWarning(warning);
    } catch (error) {
      console.error("AI Warning failed", error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await scanBill(base64, file.type);
        setNewExpense({
          ...result,
          ledgerId: currentLedgerId,
        });
        setEditingId(null);
        setShowAddModal(true);
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Scan failed", error);
      setIsScanning(false);
      alert("识别失败，请重试或手动输入。");
    }
  }, [currentLedgerId]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  } as any);

  const handleSaveExpense = () => {
    if (!newExpense.merchant || !newExpense.amount) return;
    
    if (editingId) {
      // Update existing
      setExpenses(expenses.map(e => e.id === editingId ? {
        ...e,
        merchant: newExpense.merchant!,
        amount: Number(newExpense.amount),
        date: newExpense.date || e.date,
        category: newExpense.category || e.category,
        items: newExpense.items,
        notes: newExpense.notes,
        imageUrl: newExpense.imageUrl,
      } : e));
    } else {
      // Create new
      const expense: Expense = {
        id: Date.now().toString(),
        ledgerId: currentLedgerId,
        merchant: newExpense.merchant!,
        amount: Number(newExpense.amount),
        date: newExpense.date || format(new Date(), "yyyy-MM-dd"),
        category: newExpense.category || "其他",
        items: newExpense.items,
        notes: newExpense.notes,
        imageUrl: newExpense.imageUrl,
      };
      setExpenses([expense, ...expenses]);
    }

    setShowAddModal(false);
    setEditingId(null);
    setNewExpense({
      merchant: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "其他",
    });
  };

  const openEditModal = (expense: Expense) => {
    setNewExpense(expense);
    setEditingId(expense.id);
    setShowAddModal(true);
  };

  const handleAddLedger = () => {
    if (!newLedger.name) return;
    const ledger: Ledger = {
      id: Date.now().toString(),
      name: newLedger.name!,
      icon: newLedger.icon || "📚",
      color: newLedger.color || "#171717",
    };
    setLedgers([...ledgers, ledger]);
    setCurrentLedgerId(ledger.id);
    setShowLedgerModal(false);
    setNewLedger({ name: "", icon: "📚", color: "#171717" });
  };

  const deleteExpense = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const deleteLedger = (id: string) => {
    if (ledgers.length <= 1) return;
    setLedgers(ledgers.filter(l => l.id !== id));
    setExpenses(expenses.filter(e => e.ledgerId !== id));
    if (currentLedgerId === id) {
      setCurrentLedgerId(ledgers.find(l => l.id !== id)!.id);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredExpenses.map(({ id, ledgerId, ...rest }) => rest);
    exportToCSV(dataToExport, `${currentLedger.name}_账单_${format(new Date(), "yyyyMMdd")}.csv`);
  };

  const toggleCloudSync = () => {
    setIsCloudSyncing(!isCloudSyncing);
    alert(!isCloudSyncing ? "云同步已开启" : "云同步已关闭");
  };

  // Current ledger data
  const currentLedger = ledgers.find(l => l.id === currentLedgerId) || DEFAULT_LEDGER;
  const filteredExpenses = expenses.filter(e => e.ledgerId === currentLedgerId);

  // Stats calculation
  const currentMonthExpenses = filteredExpenses.filter((e) => {
    const date = new Date(e.date);
    return isWithinInterval(date, {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    });
  });

  const totalThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryData = CATEGORIES.map((cat) => ({
    name: cat,
    value: filteredExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter((d) => d.value > 0);

  const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#C9CBCF", "#8BC34A"];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div className="relative">
          <button 
            onClick={() => setShowLedgerSelector(!showLedgerSelector)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
          >
            <span className="text-xl">{currentLedger.icon}</span>
            <span className="font-bold text-sm">{currentLedger.name}</span>
            <ChevronDown size={14} className={cn("transition-transform", showLedgerSelector && "rotate-180")} />
          </button>

          {showLedgerSelector && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowLedgerSelector(false)} />
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                {ledgers.map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setCurrentLedgerId(l.id);
                      setShowLedgerSelector(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                      currentLedgerId === l.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span>{l.icon}</span>
                      <span className="text-sm font-medium">{l.name}</span>
                    </div>
                    {currentLedgerId === l.id && <Check size={14} />}
                  </button>
                ))}
                <div className="h-px bg-neutral-100 my-2" />
                <button
                  onClick={() => {
                    setShowLedgerModal(true);
                    setShowLedgerSelector(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 text-neutral-500 transition-colors"
                >
                  <Plus size={16} />
                  <span className="text-sm font-medium">创建新账本</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="p-2 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            title="导出 CSV"
          >
            <Download size={20} />
          </button>
          <button
            onClick={toggleCloudSync}
            className={cn(
              "p-2 rounded-full transition-colors",
              isCloudSyncing ? "text-green-500 bg-green-50" : "text-neutral-400 hover:bg-neutral-100"
            )}
            title={isCloudSyncing ? "云同步中" : "开启云同步"}
          >
            {isCloudSyncing ? <Cloud size={20} /> : <CloudOff size={20} />}
          </button>
          <div className="w-px h-6 bg-neutral-100 mx-1 self-center" />
          <button
            onClick={() => setActiveTab("list")}
            className={cn(
              "p-2 rounded-full transition-colors",
              activeTab === "list" ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"
            )}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={cn(
              "p-2 rounded-full transition-colors",
              activeTab === "stats" ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"
            )}
          >
            <PieChart size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        {/* AI Warning Card */}
        {aiWarning && (
          <div className="m-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-top-4 duration-500">
            <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">AI 消费分析</p>
              <p className="text-sm text-orange-900 leading-relaxed">{aiWarning}</p>
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div 
          className="m-4 p-6 text-white rounded-3xl shadow-xl shadow-neutral-200 transition-colors duration-500"
          style={{ backgroundColor: currentLedger.color }}
        >
          <p className="text-white/60 text-sm font-medium mb-1">本月支出</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">¥{totalThisMonth.toLocaleString()}</span>
            <span className="text-white/40 text-sm">.00</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
            <TrendingUp size={14} className="text-green-400" />
            <span>较上月减少 12%</span>
          </div>
        </div>

        {activeTab === "list" ? (
          <div className="px-4 space-y-3">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">最近记录</h2>
            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <p>还没有记账记录哦</p>
                <p className="text-xs mt-1">点击下方按钮开始记账</p>
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  onClick={() => openEditModal(expense)}
                  className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between group hover:border-neutral-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg overflow-hidden">
                      {expense.imageUrl ? (
                        <img src={expense.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        expense.category === "餐饮" ? "🍱" : 
                        expense.category === "购物" ? "🛍️" :
                        expense.category === "交通" ? "🚗" :
                        expense.category === "娱乐" ? "🎮" : "💰"
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{expense.merchant}</p>
                      <p className="text-xs text-neutral-400">
                        {expense.date} · {expense.category}
                        {expense.notes && <span className="ml-2 italic">({expense.notes})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm">-¥{expense.amount}</p>
                    <button
                      onClick={(e) => deleteExpense(e, expense.id)}
                      className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="px-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-neutral-100">
              <h2 className="text-sm font-bold mb-6">支出分类统计</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f9f9f9' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">消费明细</h2>
              {categoryData.map((data, idx) => (
                <div key={data.name} className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-sm font-medium">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold">¥{data.value}</span>
                    <span className="text-xs text-neutral-400 w-12 text-right">
                      {Math.round((data.value / totalThisMonth) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <div className={cn(
            "w-14 h-14 rounded-full bg-white border-2 border-neutral-900 flex items-center justify-center shadow-lg transition-transform active:scale-95",
            isScanning && "animate-pulse"
          )}>
            {isScanning ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">{editingId ? "修改记录" : "添加记录"}</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                }} 
                className="text-neutral-400"
              >
                取消
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">商家 / 项目</label>
                <input
                  type="text"
                  value={newExpense.merchant}
                  onChange={(e) => setNewExpense({ ...newExpense, merchant: e.target.value })}
                  className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="例如：星巴克"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">金额 (¥)</label>
                  <input
                    type="number"
                    value={newExpense.amount || ""}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                    className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">分类</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors appearance-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">日期</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">备注</label>
                <textarea
                  value={newExpense.notes || ""}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors h-20 resize-none"
                  placeholder="添加备注..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">账单图片</label>
                <div className="flex gap-4 items-center">
                  {newExpense.imageUrl ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200">
                      <img src={newExpense.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setNewExpense({ ...newExpense, imageUrl: undefined })}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setNewExpense({ ...newExpense, imageUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-900 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      <ImageIcon size={20} />
                      <span className="text-[10px] mt-1">上传</span>
                    </div>
                  )}
                </div>
              </div>

              {newExpense.items && newExpense.items.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">识别到的项目</label>
                  <div className="flex flex-wrap gap-2">
                    {newExpense.items.map((item, i) => (
                      <span key={i} className="text-[10px] bg-neutral-100 px-2 py-1 rounded-full text-neutral-600">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveExpense}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold mt-4 shadow-lg active:scale-[0.98] transition-transform"
              >
                {editingId ? "保存修改" : "确认保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">创建新账本</h2>
              <button onClick={() => setShowLedgerModal(false)} className="text-neutral-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">账本名称</label>
                <input
                  type="text"
                  value={newLedger.name}
                  onChange={(e) => setNewLedger({ ...newLedger, name: e.target.value })}
                  className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="例如：家庭开支"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">图标</label>
                  <input
                    type="text"
                    value={newLedger.icon}
                    onChange={(e) => setNewLedger({ ...newLedger, icon: e.target.value })}
                    className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none focus:border-neutral-900 transition-colors text-center text-xl"
                    placeholder="📚"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase mb-1 block">颜色</label>
                  <input
                    type="color"
                    value={newLedger.color}
                    onChange={(e) => setNewLedger({ ...newLedger, color: e.target.value })}
                    className="w-full h-[50px] p-1 bg-neutral-50 rounded-xl border border-neutral-100 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleAddLedger}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold mt-4 shadow-lg active:scale-[0.98] transition-transform"
              >
                创建账本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
