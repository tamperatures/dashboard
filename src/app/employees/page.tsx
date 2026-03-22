'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    UserPlus, Users, Shield, ShieldCheck, Trash2,
    Edit, Loader2, AlertCircle, Search, Mail, Phone,
    Lock, User, Briefcase, X, Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

interface Employee {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'staff';
    department?: string; // legacy single
    departments?: string[]; // new multi-department
    phone?: string;
    position?: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

// Helper to get departments array from employee (backward compatible)
const getEmpDepts = (e: Employee): string[] => e.departments || (e.department ? [e.department] : []);

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

const DEPARTMENTS = ['推廣部', '銷售部', '設計部', '工程部', '會計部', '管理處'];

export default function EmployeesPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const userDept = (session?.user as any)?.department;

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const toast = useToast();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Employee | null>(null);
    const [error, setError] = useState('');

    // Form state
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formRole, setFormRole] = useState<'admin' | 'staff'>('staff');
    const [formDepartments, setFormDepartments] = useState<string[]>([]);
    const [formPhone, setFormPhone] = useState('');
    const [formPosition, setFormPosition] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setEmployees(data.users || []);
        } catch {
            setError('無法載入員工資料');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormRole('staff');
        setFormDepartments(userRole === 'admin' ? [] : (userDept ? [userDept] : []));
        setFormPhone('');
        setFormPosition('');
        setFormError('');
        setShowCreateModal(true);
    };

    const openEditModal = (emp: Employee) => {
        setEditingUser(emp);
        setFormName(emp.name);
        setFormEmail(emp.email);
        setFormPassword('');
        setFormRole(emp.role);
        setFormDepartments(getEmpDepts(emp));
        setFormPhone(emp.phone || '');
        setFormPosition(emp.position || '');
        setFormError('');
        setShowCreateModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            if (editingUser) {
                const res = await fetch(`/api/employees/${editingUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formName, email: formEmail, role: formRole,
                        departments: formDepartments, phone: formPhone, position: formPosition,
                        ...(formPassword ? { password: formPassword } : {}),
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || '更新失敗');
                }
            } else {
                const res = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formName, email: formEmail, password: formPassword,
                        role: formRole, departments: formDepartments, phone: formPhone, position: formPosition,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || '建立失敗');
                }
            }
            setShowCreateModal(false);
            fetchEmployees();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: '刪除員工',
            description: '確定要刪除此員工帳號嗎？此操作無法撤銷。',
            variant: 'danger',
            confirmText: '刪除',
        });
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || '刪除失敗');
                return;
            }
            fetchEmployees();
        } catch {
            toast.error('刪除失敗');
        }
    };

    const visibleEmployees = employees.filter(e =>
        userRole === 'admin' || getEmpDepts(e).includes(userDept)
    );

    const filtered = visibleEmployees.filter(e => {
        const empDepts = getEmpDepts(e);
        const matchesDept = deptFilter === 'all' || empDepts.includes(deptFilter);
        const matchesSearch = !search || e.name.includes(search) || e.email.includes(search) || (e.position || '').includes(search);
        return matchesDept && matchesSearch;
    });

    return (
        <>
            <motion.div className="max-w-[1600px] mx-auto space-y-8 pb-12" initial="hidden" animate="show" variants={container}>
                {/* Header */}
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">員工管理</h2>
                        <p className="text-sm text-slate-500 mt-1">管理系統帳號及權限設定</p>
                    </div>
                    <Button onClick={openCreateModal} className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md text-sm">
                        <UserPlus className="h-4 w-4" /> 新增員工
                    </Button>
                </motion.div>

                {/* Stats */}
                <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="shadow-sm border-slate-200/60">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Users className="h-5 w-5" /></div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">總員工</p>
                                <p className="text-2xl font-bold text-slate-900">{visibleEmployees.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200/60">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><ShieldCheck className="h-5 w-5" /></div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">管理員</p>
                                <p className="text-2xl font-bold text-slate-900">{visibleEmployees.filter(e => e.role === 'admin').length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200/60">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Briefcase className="h-5 w-5" /></div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">員工</p>
                                <p className="text-2xl font-bold text-slate-900">{visibleEmployees.filter(e => e.role === 'staff').length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Department Filter + Search */}
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center bg-[#F5F5F7] rounded-xl p-1 gap-0.5 overflow-x-auto">
                        <button
                            onClick={() => setDeptFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${deptFilter === 'all'
                                ? 'bg-white text-[#1D1D1F] shadow-sm'
                                : 'text-[#86868B] hover:text-[#424245]'
                                }`}
                        >
                            全部 ({visibleEmployees.length})
                        </button>
                        {DEPARTMENTS.map(dept => {
                            const count = visibleEmployees.filter(e => getEmpDepts(e).includes(dept)).length;
                            return (
                                <button
                                    key={dept}
                                    onClick={() => setDeptFilter(dept)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${deptFilter === dept
                                        ? 'bg-white text-[#0071E3] shadow-sm'
                                        : 'text-[#86868B] hover:text-[#424245]'
                                        }`}
                                >
                                    {dept} ({count})
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                        <input type="text" placeholder="搜尋員工名稱、電郵..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F5F7] border border-[#D1D1D6] rounded-xl focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 placeholder:text-[#86868B] transition-all"
                        />
                    </div>
                </motion.div>

                {/* Employee Table */}
                <motion.div variants={fadeUp}>
                    <Card className="shadow-sm border-slate-200/60 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3.5">員工</th>
                                        <th className="px-4 py-3.5">電郵</th>
                                        <th className="px-4 py-3.5">部門</th>
                                        <th className="px-4 py-3.5">職位</th>
                                        <th className="px-4 py-3.5">角色</th>
                                        <th className="px-4 py-3.5">狀態</th>
                                        <th className="px-4 py-3.5 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">沒有符合條件的員工</td></tr>
                                    ) : filtered.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 overflow-hidden">
                                                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name}`} alt="" className="w-full h-full" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{emp.name}</p>
                                                        {emp.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {emp.phone}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 text-xs">{emp.email}</td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {getEmpDepts(emp).length > 0 ? getEmpDepts(emp).map(d => (
                                                        <span key={d} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F5F5F7] text-[#424245]">{d}</span>
                                                    )) : <span className="text-sm text-slate-400">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 text-sm">{emp.position || '—'}</td>
                                            <td className="px-4 py-3.5">
                                                <Badge variant="outline" className={`text-[11px] font-semibold border-transparent ${emp.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                                    {emp.role === 'admin' ? '管理員' : '員工'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <Badge variant="outline" className={`text-[11px] font-semibold border-transparent ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {emp.status === 'active' ? '啟用' : '停用'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </motion.div>

                {/* Create/Edit Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-[#1D1D1F]">
                                {editingUser ? '編輯員工' : '新增員工'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                            {formError && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-xl">
                                    <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">姓名 *</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                                    <Input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="員工姓名" className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">電郵 *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                                    <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required placeholder="email@tpt.com" className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">{editingUser ? '新密碼 (留空不變)' : '密碼 *'}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                                    <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} required={!editingUser} placeholder="••••••••" className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">角色權限</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={userRole !== 'admin'}
                                        onClick={() => setFormRole('staff')}
                                        className={`relative p-3 rounded-xl border-2 transition-all duration-200 text-left disabled:opacity-50 ${formRole === 'staff'
                                            ? 'border-[#0071E3] bg-[#0071E3]/5'
                                            : 'border-[#D1D1D6] bg-[#F5F5F7] hover:border-[#86868B]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formRole === 'staff' ? 'border-[#0071E3] bg-[#0071E3]' : 'border-[#C7C7CC]'
                                                }`}>
                                                {formRole === 'staff' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            <span className={`text-sm font-bold ${formRole === 'staff' ? 'text-[#0071E3]' : 'text-[#1D1D1F]'}`}>員工</span>
                                        </div>
                                        <p className="text-[10px] text-[#86868B] pl-6">部分權限存取</p>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={userRole !== 'admin'}
                                        onClick={() => setFormRole('admin')}
                                        className={`relative p-3 rounded-xl border-2 transition-all duration-200 text-left disabled:opacity-50 ${formRole === 'admin'
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-[#D1D1D6] bg-[#F5F5F7] hover:border-[#86868B]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formRole === 'admin' ? 'border-amber-500 bg-amber-500' : 'border-[#C7C7CC]'
                                                }`}>
                                                {formRole === 'admin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            <span className={`text-sm font-bold ${formRole === 'admin' ? 'text-amber-600' : 'text-[#1D1D1F]'}`}>管理員</span>
                                        </div>
                                        <p className="text-[10px] text-[#86868B] pl-6">最高層級存取和變更</p>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">部門權限(可多選)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DEPARTMENTS.map(dept => {
                                        const isChecked = formDepartments.includes(dept);
                                        return (
                                            <button
                                                key={dept}
                                                type="button"
                                                disabled={userRole !== 'admin'}
                                                onClick={() => {
                                                    if (isChecked) {
                                                        setFormDepartments(formDepartments.filter(d => d !== dept));
                                                    } else {
                                                        setFormDepartments([...formDepartments, dept]);
                                                    }
                                                }}
                                                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 disabled:opacity-50 ${isChecked
                                                    ? 'bg-[#0071E3]/10 border-[#0071E3]/30 text-[#0071E3]'
                                                    : 'bg-[#F5F5F7] border-[#D1D1D6] text-[#86868B] hover:border-[#86868B]'
                                                    }`}
                                            >
                                                {isChecked ? '✓ ' : ''}{dept}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">電話</label>
                                    <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="9000 0000" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">職位</label>
                                    <Input value={formPosition} onChange={e => setFormPosition(e.target.value)} placeholder="項目經理" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-3">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>取消</Button>
                                <Button type="submit" disabled={formLoading}>
                                    {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingUser ? '儲存' : '建立'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </motion.div>
            {ConfirmDialogComponent}
        </>
    );
}
