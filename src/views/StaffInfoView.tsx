import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { Staff } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { playSound } from '../utils/sound.ts';
import {
  User,
  Briefcase,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
} from 'lucide-react';

export const StaffInfoView: React.FC = () => {
  const { staffList, addStaff, updateStaff, deleteStaff, setActivePage } = usePOS();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const filtered = staffList.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.position.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setPosition('បុគ្គលិកលក់ (Sales)');
    setPhone('');
    setAddress('រាជធានីភ្នំពេញ');
    setIsModalOpen(true);
    playSound.click();
  };

  const handleOpenEdit = (s: Staff) => {
    setEditingStaff(s);
    setName(s.name);
    setPosition(s.position);
    setPhone(s.phone);
    setAddress(s.address || '');
    setIsModalOpen(true);
    playSound.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStaff) {
      await updateStaff({
        ...editingStaff,
        name,
        position,
        phone,
        address,
      });
    } else {
      await addStaff({
        name,
        position,
        phone,
        address,
      });
    }
    playSound.successChime();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, sName: string) => {
    if (confirm(`តើអ្នកពិតជាចង់លុបបុគ្គលិក "${sName}" មែនទេ?`)) {
      playSound.warning();
      await deleteStaff(id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="staff_info" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              ពត៍មានបុគ្គលិក (Staff Information)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              បង្ហាញពត៍មានបុគ្គលិកដែលបានកំណត់ក្នុង Setting · ឈ្មោះ, មុខដំណែង, លេខទូរស័ព្ទ, អាស័យដ្ឋាន
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 btn-3d"
        >
          <Plus size={16} />
          <span>+ បន្ថែមបុគ្គលិកថ្មី (Add Staff)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកបុគ្គលិកតាមឈ្មោះ មុខដំណែង ឬលេខទូរស័ព្ទ..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Staff Form Carts Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានបុគ្គលិកដែលត្រូវនឹងការស្វែងរកនេះទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((st) => (
            <div
              key={st.id}
              className="card-3d relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3"
            >
              {/* Header Profile Badge */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
                    {st.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {st.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block mt-0.5">
                      {st.position}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(st)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="កែប្រែ"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(st.id, st.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="លុប"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Details: Phone & Address */}
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <Phone size={14} className="text-indigo-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">លេខទូរស័ព្ទ:</span>
                    <span className="font-mono font-bold">{st.phone || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <MapPin size={14} className="text-sky-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">អាស័យដ្ឋាន:</span>
                    <span className="font-medium">{st.address || 'រាជធានីភ្នំពេញ'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 px-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingStaff ? 'កែប្រែពត៍មានបុគ្គលិក' : 'បន្ថែមបុគ្គលិកថ្មី'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ឈ្មោះបុគ្គលិក *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. ហួត ដារ៉ា"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  មុខដំណែង (Position) *
                </label>
                <input
                  type="text"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="ឧ. បុគ្គលិកលក់ (Sales Specialist)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  លេខទូរស័ព្ទ *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ឧ. 012 345 678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  អាស័យដ្ឋាន (Address)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ខណ្ឌទួលគោក, ភ្នំពេញ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 btn-3d"
                >
                  <Save size={14} />
                  <span>រក្សាទុក</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
