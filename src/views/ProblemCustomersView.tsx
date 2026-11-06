import React, { useState } from 'react';
import { usePOS } from '../context/POSContext.tsx';
import { ProblemCustomer } from '../types/index.ts';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { playSound } from '../utils/sound.ts';
import {
  Search,
  Plus,
  Trash2,
  Phone,
  UserX,
  AlertTriangle,
  Calendar,
  Save,
  X,
  ExternalLink,
} from 'lucide-react';

export const ProblemCustomersView: React.FC = () => {
  const { problemCustomers, orders, addProblemCustomer, deleteProblemCustomer } = usePOS();
  const [search, setSearch] = useState('');

  // Add form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = problemCustomers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទ!');
      return;
    }
    await addProblemCustomer({
      name,
      phone,
      notes: notes || 'អតិថិជនមានបញ្ហា',
    });
    playSound.warning();
    setName('');
    setPhone('');
    setNotes('');
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string, custName: string) => {
    if (confirm(`តើអ្នកពិតជាចង់លុប "${custName}" ចេញពីបញ្ជីអតិថិជនមានបញ្ហាមែនទេ?`)) {
      playSound.click();
      await deleteProblemCustomer(id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-16">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon3D name="problem_customers" size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              កំណត់ត្រាអតិថិជនមានបញ្ហា (Problem Customers)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              សរុប {problemCustomers.length} នាក់ · ប្រព័ន្ធនឹងផ្ដល់ការព្រមានដោយស្វ័យប្រវត្តិក្នង POS ពេលបញ្ចូលលេខទូរស័ព្ទនេះ
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsFormOpen(true);
            playSound.click();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 btn-3d"
        >
          <Plus size={16} />
          <span>+ បន្ថែមកំណត់ត្រាថ្មី (Add Problem Customer)</span>
        </button>
      </div>

      {/* Search Input (តាមឈ្មោះ, តាមលេខទូរស័ព្ទ) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទអតិថិជនមានបញ្ហា..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Add Problem Customer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 px-6 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-bold">
                  បន្ថែម កំណត់ត្រាអតិថិជនមានបញ្ហា
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. ឈ្មោះអតិថិជនមានបញ្ហា *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. កែវ វណ្ណៈ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. លេខទូរស័ព្ទ *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ឧ. 012 999 000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3. កំណត់ចំណាំ (មូលហេតុ ឬបញ្ហា) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ឧ. កុហកថាផ្ទេរប្រាក់រួច ឬជំពាក់គេចវេសមិនសង..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 btn-3d"
                >
                  <Save size={14} />
                  <span>រក្សាទុក</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Problem Customers Standard Form Carts Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          មិនមានអតិថិជនមានបញ្ហាដែលត្រូវនឹងការស្វែងរកទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="card-3d relative flex flex-col justify-between p-5 rounded-3xl bg-gradient-to-br from-red-50/70 to-white dark:from-red-950/20 dark:to-slate-900 border border-red-200 dark:border-red-900/60 shadow-md space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-red-100 dark:border-red-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    <UserX size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </h3>
                    <div className="text-[10px] text-slate-400">
                      កាលបរិច្ឆេទកត់ត្រា៖ {item.createdAt.split('T')[0]}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                  title="លុប"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Phone display */}
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300">
                  <Phone size={14} />
                  <span>លេខទូរស័ព្ទ:</span>
                </span>
                <span className="font-mono font-black text-red-600 dark:text-red-400 text-sm">
                  {item.phone}
                </span>
              </div>

              {/* Notes */}
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/60 p-3 rounded-2xl border border-red-100 dark:border-red-900/40">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">
                  មូលហេតុ / កំណត់ចំណាំ:
                </span>
                <p className="line-clamp-3 leading-relaxed">
                  {item.notes}
                </p>
                {item.reportedByStaff && (
                  <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-1">
                    កត់ត្រាដោយ៖ {item.reportedByStaff}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
