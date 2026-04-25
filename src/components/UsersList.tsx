import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { UserPlus, Search, Trash2, X, Pencil, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from './Toast';

interface UsersListProps {
  token: string;
  userRole: UserRole;
}

export default function UsersList({ token, userRole }: UsersListProps) {
  const { showSuccess, showError } = useToast();
  
  if (userRole !== 'headmaster') {
    return (
      <div className="card-app p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Access denied</h2>
        <p className="mt-2 text-xs text-slate-500">Mkuu wa Shule tu ndiye anayeruhusiwa kusimamia Staff.</p>
      </div>
    );
  }

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    tsc_no: '',
    email: '',
    password: '',
    phone: '',
    role: 'teacher' as UserRole
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setShowPassword(false);
    setFormData({ full_name: '', tsc_no: '', email: '', password: '', phone: '', role: 'teacher' });
  };

  const openAdd = () => {
    setEditingId(null);
    setShowPassword(false);
    setFormData({ full_name: '', tsc_no: '', email: '', password: '', phone: '', role: 'teacher' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setShowPassword(false);
    setFormData({
      full_name: u.full_name || '',
      tsc_no: u.tsc_no || '',
      email: u.email || '',
      password: '',
      phone: u.phone || '',
      role: u.role,
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const method = editingId ? 'PUT' : 'POST';
    const payload: any = { ...formData };
    if (editingId && (!payload.password || String(payload.password).trim() === '')) {
      delete payload.password;
    }

    const res = await fetch(url, {
      method,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const msg = data?.error || 'Failed to save staff';
      // Check for duplicate or existing user message
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        showError('User already exists, record updated');
      } else {
        showError(msg);
      }
      return;
    }

    const data = await res.json().catch(() => null);
    closeModal();
    showSuccess(editingId ? 'Staff updated successfully!' : 'Staff registered successfully!');
    fetchUsers();
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.tsc_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800">Wafanyakazi <span className="text-brand-primary">STAFF</span></h2>
          <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest opacity-60">Management of Teachers and Administrators</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center space-x-2">
          <UserPlus size={18} />
          <span>Authorize New Staff</span>
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="SEARCH BY NAME OR TSC NUMBER..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-xl focus:border-brand-primary transition-all outline-none font-bold text-xs uppercase"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-black tracking-widest">
                <th className="px-8 py-5">Full Name</th>
                <th className="px-8 py-5">TSC No.</th>
                <th className="px-8 py-5">Assignment</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black">
                        {u.full_name?.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-mono text-slate-500 font-bold tracking-tight">
                    {u.tsc_no || 'SYSTEM-AUTH'}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                      u.role === 'headmaster' ? 'bg-brand-dark text-white' :
                      u.role === 'academic' ? 'bg-brand-primary text-white' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-slate-400 hover:text-brand-primary transition-colors"
                        title="Edit"
                        aria-label={`Edit ${u.full_name}`}
                      >
                        <Pencil size={18} />
                      </button>
                      <button className="text-slate-300 hover:text-red-600 transition-colors" title="Delete (not enabled)">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100"
          >
            <form onSubmit={handleSaveUser}>
              <div className="bg-brand-sidebar p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center space-x-2">
                  <UserPlus />
                  <span>{editingId ? 'Sasisha Taarifa za Staff' : 'Sajili Mwalimu Mpya'}</span>
                </h2>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-white">
                  <X />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Jina Kamili</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                    placeholder="Mwl. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Namba ya TSC</label>
                  <input 
                    type="text" 
                    value={formData.tsc_no}
                    onChange={e => setFormData({...formData, tsc_no: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary font-mono"
                    placeholder="TSC-123456"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                    placeholder="john@kizaga.sc.tz"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nywila (Password)</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required={!editingId}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full p-3 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                      placeholder={editingId ? 'Leave blank to keep current' : '••••••••'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editingId && (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300 italic">
                      Current password is not visible. Leave blank to keep it.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                    placeholder="0712 XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Wadhifa (Role)</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
                  >
                    <option value="teacher">Mwalimu</option>
                    <option value="academic">Mkuu wa Taaluma</option>
                    <option value="headmaster">Mkuu wa Shule</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex justify-end space-x-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-700"
                >
                  Ghairi
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold shadow-lg hover:brightness-110 transition-all"
                >
                  Hifadhi Taarifa
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
