import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserAccount, UserRole } from '../types';
import { 
  Users, UserPlus, Shield, ShieldCheck, Trash2, Edit2, Key, 
  X, Check, AlertTriangle, Eye, EyeOff, Lock, UserCheck, Sparkles 
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, addUser, updateUser, deleteUser, isAdmin } = useApp();

  const [isAddMode, setIsAddMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formDepartment, setFormDepartment] = useState('แผนกซ่อมบำรุง');
  const [formRole, setFormRole] = useState<UserRole>('technician');

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const resetForm = () => {
    setFormUsername('');
    setFormPassword('');
    setFormName('');
    setFormDepartment('แผนกซ่อมบำรุง');
    setFormRole('technician');
    setIsAddMode(false);
    setEditingUserId(null);
    setFeedbackMsg(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddMode(true);
  };

  const handleStartEdit = (user: UserAccount) => {
    setEditingUserId(user.id);
    setFormUsername(user.username);
    setFormPassword(user.password);
    setFormName(user.name);
    setFormDepartment(user.department || 'แผนกซ่อมบำรุง');
    setFormRole(user.role);
    setIsAddMode(false);
    setFeedbackMsg(null);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const result = addUser({
      username: formUsername,
      password: formPassword,
      name: formName,
      department: formDepartment,
      role: formRole
    });

    if (result.success) {
      setFeedbackMsg({ text: `เพิ่มผู้ใช้งาน "${formUsername}" สำเร็จแล้ว`, type: 'success' });
      resetForm();
    } else {
      setFeedbackMsg({ text: result.message || 'ไม่สามารถเพิ่มผู้ใช้ได้', type: 'error' });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setFeedbackMsg(null);

    const result = updateUser(editingUserId, {
      username: formUsername,
      password: formPassword,
      name: formName,
      department: formDepartment,
      role: formRole
    });

    if (result.success) {
      setFeedbackMsg({ text: `อัปเดตข้อมูลผู้ใช้งานสำเร็จ`, type: 'success' });
      resetForm();
    } else {
      setFeedbackMsg({ text: result.message || 'ไม่สามารถแก้ไขข้อมูลได้', type: 'error' });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้ "${name}" ออกจากระบบ?`)) {
      return;
    }

    const result = deleteUser(id);
    if (result.success) {
      setFeedbackMsg({ text: `ลบบัญชีผู้ใช้เรียบร้อยแล้ว`, type: 'success' });
    } else {
      setFeedbackMsg({ text: result.message || 'ไม่สามารถลบบัญชีได้', type: 'error' });
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Shield size={12} className="text-amber-400" />
            ผู้ดูแลระบบ (Admin)
          </span>
        );
      case 'technician':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <UserCheck size={12} className="text-cyan-400" />
            ช่างซ่อมบำรุง (Technician)
          </span>
        );
      case 'viewer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Eye size={12} className="text-emerald-400" />
            ผู้ดูข้อมูล (Viewer)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึง (User Management)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {users.length} บัญชีในระบบ
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                เพิ่ม ลบ แก้ไข รหัสผ่าน และกำหนดสิทธิ์การแก้ไข/ลบข้อมูลตามบทบาทหน้าที่
              </p>
            </div>
          </div>
          
          <button
            id="btn-close-user-management"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`p-3 text-xs flex items-center justify-between border-b ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}>
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="hover:opacity-75">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          
          {/* Permission Explanation Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <Shield size={14} />
                <span>ผู้ดูแลระบบ (Admin)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                สิทธิ์สูงสุด: ดูข้อมูล, เพิ่ม/แก้ไข/ลบ เครื่องจักร แผน PM บันทึกซ่อม และจัดการเพิ่ม-ลบผู้ใช้งาน
              </p>
            </div>

            <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                <UserCheck size={14} />
                <span>ช่างซ่อมบำรุง (Technician)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                สิทธิ์ปฏิบัติงาน: ดูข้อมูล, บันทึกการซ่อม, ทำแผน PM, อัปเดตสถานะ (ไม่อนุญาตให้ลบข้อมูลหลัก)
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <Eye size={14} />
                <span>ผู้ดูข้อมูล (Viewer)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                สิทธิ์ตรวจสอบ: ดูแดชบอร์ด ดูสถิติ MTTR แผน PM (ไม่อนุญาตให้แก้ไขหรือลบข้อมูลใดๆ)
              </p>
            </div>
          </div>

          {/* Form section (Add or Edit) */}
          {(isAddMode || editingUserId) ? (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  {isAddMode ? (
                    <>
                      <UserPlus size={16} className="text-cyan-400" />
                      <span>เพิ่มบัญชีผู้ใช้งานใหม่</span>
                    </>
                  ) : (
                    <>
                      <Edit2 size={16} className="text-amber-400" />
                      <span>แก้ไขข้อมูลบัญชีผู้ใช้งาน</span>
                    </>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ยกเลิก
                </button>
              </div>

              <form onSubmit={isAddMode ? handleSaveAdd : handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชื่อผู้ใช้ (Username) *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="เช่น tech_somchai"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">ใช้ภาษาอังกฤษหรือตัวเลขสำหรับเข้าสู่ระบบ</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รหัสผ่าน (Password) *</label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="ตั้งรหัสผ่าน"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">รหัสผ่านสำหรับยืนยันตัวตน</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชื่อ-นามสกุล / ตำแหน่ง *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="เช่น สมชาย ใจมั่นคง (ช่างเครื่องจักร)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">แผนก / สังกัด</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={e => setFormDepartment(e.target.value)}
                    placeholder="เช่น แผนกซ่อมบำรุง, แผนกผลิต"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">ระดับสิทธิ์ (Role) *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      formRole === 'admin' 
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="formRole"
                        value="admin"
                        checked={formRole === 'admin'}
                        onChange={() => setFormRole('admin')}
                        className="mt-0.5 text-amber-500"
                      />
                      <div>
                        <div className="font-bold text-xs">👑 Admin (ผู้ดูแล)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">แก้ไข + ลบ + จัดการผู้ใช้</div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      formRole === 'technician' 
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="formRole"
                        value="technician"
                        checked={formRole === 'technician'}
                        onChange={() => setFormRole('technician')}
                        className="mt-0.5 text-cyan-500"
                      />
                      <div>
                        <div className="font-bold text-xs">🔧 Technician (ช่าง)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">บันทึก/แก้ไขข้อมูล (ห้ามลบ)</div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      formRole === 'viewer' 
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="formRole"
                        value="viewer"
                        checked={formRole === 'viewer'}
                        onChange={() => setFormRole('viewer')}
                        className="mt-0.5 text-emerald-500"
                      />
                      <div>
                        <div className="font-bold text-xs">👁️ Viewer (ดูอย่างเดียว)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">ดูสถิติ/รายงาน (ห้ามแก้ไข)</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg shadow-md"
                  >
                    {isAddMode ? 'บันทึกผู้ใช้ใหม่' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">
                รายการบัญชีที่สามารถเข้าสู่ระบบได้
              </span>
              <button
                id="btn-open-add-user"
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg shadow transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>เพิ่มผู้ใช้ใหม่ (Add User)</span>
              </button>
            </div>
          )}

          {/* User List Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="p-3">ชื่อผู้ใช้ (Username)</th>
                  <th className="p-3">ชื่อ-นามสกุล</th>
                  <th className="p-3">รหัสผ่าน</th>
                  <th className="p-3">สิทธิ์การใช้งาน (Role)</th>
                  <th className="p-3">แผนก</th>
                  <th className="p-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map(u => {
                  const isCurrent = currentUser?.id === u.id;
                  const isPassVisible = !!showPasswordMap[u.id];

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{u.username}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-normal">
                              บัญชีคุณ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {u.id.substring(0, 10)}...</div>
                      </td>

                      <td className="p-3 font-medium text-slate-300">
                        {u.name}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-300">
                            {isPassVisible ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-slate-500 hover:text-cyan-400 transition"
                            title={isPassVisible ? "ซ่อนรหัสผ่าน" : "ดูรหัสผ่าน"}
                          >
                            {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>

                      <td className="p-3">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="p-3 text-slate-400 text-[11px]">
                        {u.department || '-'}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                            title="แก้ไขข้อมูล/เปลี่ยนรหัสผ่าน"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleDelete(u.id, u.name)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent 
                                ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-600' 
                                : 'bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400'
                            }`}
                            title={isCurrent ? "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้" : "ลบบัญชีผู้ใช้นี้"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 text-xs">
          <div className="text-slate-400">
            ข้อมูลบัญชีจะถูกซิงค์จัดเก็บในระบบอย่างปลอดภัยร่วมกับ Cloud Firestore
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
