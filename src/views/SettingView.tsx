import React, { useState } from 'react';
import { usePOS, PageId } from '../context/POSContext.tsx';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import { Language, Currency } from '../types/index.ts';
import { playSound } from '../utils/sound.ts';
import {
  User,
  Moon,
  Sun,
  Globe,
  DollarSign,
  ShieldAlert,
  Warehouse as WarehouseIcon,
  Store,
  Users,
  Briefcase,
  Layers,
  Plus,
  Trash2,
  Lock,
  Unlock,
  LogOut,
  AlertOctagon,
  Save,
  Check,
} from 'lucide-react';

export const SettingView: React.FC = () => {
  const {
    user,
    settings,
    updateSettings,
    warehouses,
    addWarehouse,
    deleteWarehouse,
    stores,
    addStore,
    deleteStore,
    groups,
    addGroup,
    deleteGroup,
    staffList,
    addStaff,
    deleteStaff,
    categories,
    addCategory,
    deleteCategory,
    openAuthModal,
    logout,
    deleteAccount,
  } = usePOS();

  // Personal info edits
  const [personalName, setPersonalName] = useState(user?.name || '');
  const [personalSaved, setPersonalSaved] = useState(false);

  // New Warehouse form
  const [newWhName, setNewWhName] = useState('');

  // New Store form
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');

  // New Group form
  const [newGroupName, setNewGroupName] = useState('');

  // New Staff form (1. ឈ្មោះបុគ្គលិកលក់, 2. មុខដំណេង, 3. លេខទូរស័ព្ទ, 4. Button រក្សារទុក)
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPosition, setNewStaffPosition] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // New Category form
  const [newCategoryName, setNewCategoryName] = useState('');

  // Delete Account confirmation
  const [deletePass, setDeletePass] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Save personal info
  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalName.trim() || !user) return;
    user.name = personalName;
    localStorage.setItem('dr_pos_user', JSON.stringify(user));
    playSound.successChime();
    setPersonalSaved(true);
    setTimeout(() => setPersonalSaved(false), 2500);
  };

  // Toggle User Access Control
  const toggleHideOtherSales = () => {
    updateSettings({
      userAccess: {
        ...settings.userAccess,
        hideOtherUsersSales: !settings.userAccess?.hideOtherUsersSales,
      },
    });
  };

  const toggleHideWarehouseReports = () => {
    updateSettings({
      userAccess: {
        ...settings.userAccess,
        hideWarehouseReports: !settings.userAccess?.hideWarehouseReports,
      },
    });
  };

  // Toggle page blockage
  const toggleBlockPage = (pageId: PageId) => {
    const currentBlocked = settings.userAccess?.blockedPages || [];
    const isCurrentlyBlocked = currentBlocked.includes(pageId);
    const updated = isCurrentlyBlocked
      ? currentBlocked.filter((p) => p !== pageId)
      : [...currentBlocked, pageId];

    updateSettings({
      userAccess: {
        ...settings.userAccess,
        blockedPages: updated,
      },
    });
  };

  // Warehouse handlers
  const handleAddWh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim()) return;
    await addWarehouse({ name: newWhName });
    setNewWhName('');
    playSound.click();
  };

  // Store handlers
  const handleAddStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    await addStore({ name: newStoreName, address: newStoreAddress, phone: newStorePhone });
    setNewStoreName('');
    setNewStoreAddress('');
    setNewStorePhone('');
    playSound.click();
  };

  // Group handlers
  const handleAddGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup({ name: newGroupName });
    setNewGroupName('');
    playSound.click();
  };

  // Staff handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPosition.trim()) return;
    await addStaff({
      name: newStaffName,
      position: newStaffPosition,
      phone: newStaffPhone,
      address: 'រាជធានីភ្នំពេញ',
    });
    setNewStaffName('');
    setNewStaffPosition('');
    setNewStaffPhone('');
    playSound.successChime();
  };

  // Category handlers
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await addCategory({ name: newCategoryName });
    setNewCategoryName('');
    playSound.click();
  };

  const allPageIds: { id: PageId; label: string }[] = [
    { id: 'pos', label: 'POS (ការលក់)' },
    { id: 'orders', label: 'Orders (ការបញ្ជាទិញ)' },
    { id: 'products', label: 'Products (ទំនិញ)' },
    { id: 'due_payments', label: 'Due Payments (ណាត់ទូទាត់)' },
    { id: 'track_staff', label: 'Track Staff (តាមដានបុគ្គលិក)' },
    { id: 'problem_customers', label: 'Problem Customers (អតិថិជនមានបញ្ហា)' },
    { id: 'stock_log', label: 'Stock Log (ប្រវត្តិស្តុក)' },
    { id: 'price_record', label: 'Price Record (កត់ត្រាតម្លៃ)' },
    { id: 'staff_info', label: 'Staff Info (ពត៍មានបុគ្គលិក)' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-3">
        <Icon3D name="setting" size={36} />
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            ការកំណត់ប្រព័ន្ធ (System Settings)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            កំណត់សិទ្ធិមើលរបាយការណ៍លក់, ឃ្លាំង, ហាង, ក្រុមអតិថិជន, បុគ្គលិក និងភាសា
          </p>
        </div>
      </div>

      {/* Grid: 1. Personal Info & 2. Display Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Personal Information */}
        <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              1. ព័ត៌មានផ្ទាល់ខ្លួន (Personal Information)
            </h3>
          </div>

          <form onSubmit={handleSavePersonalInfo} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block mb-1">គណនី Gmail ភ្ជាប់ Realtime:</label>
              <input
                type="text"
                disabled
                value={user?.email || 'darahouthr@gmail.com'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                ឈ្មោះអ្នកគ្រប់គ្រង (Admin Name):
              </label>
              <input
                type="text"
                required
                value={personalName}
                onChange={(e) => setPersonalName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {personalSaved && (
                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <Check size={14} />
                  <span>បានរក្សាទុកជោគជ័យ!</span>
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs btn-3d shadow-md shadow-indigo-600/20"
              >
                រក្សាទុកពត៍មាន
              </button>
            </div>
          </form>
        </div>

        {/* 2. Preferences: Dark Mode, Language, Currency */}
        <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Globe size={18} className="text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. ការកំណត់ការបង្ហាញ (Display & Localization)
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Dark Mode */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                {settings.darkMode ? <Moon size={18} className="text-sky-400" /> : <Sun size={18} className="text-amber-500" />}
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">2. Dark Mode (ពន្លឺងងឹត)</span>
                  <span className="text-[10px] text-slate-500">ប្តូររវាង Dark Mode និង Light Mode</span>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.darkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            {/* Language Selection: kh / en / kr */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-800 dark:text-white block">3. Language (ភាសា)</span>
                <span className="text-[10px] text-slate-500">ជ្រើសរើសភាសាប្រើប្រាស់ក្នុងប្រព័ន្ធ</span>
              </div>
              <div className="flex gap-1 bg-white dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                {(['kh', 'en', 'kr'] as Language[]).map((lng) => (
                  <button
                    key={lng}
                    onClick={() => updateSettings({ language: lng })}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                      settings.language === lng
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {lng === 'kh' ? 'ខ្មែរ' : lng === 'kr' ? '한국어' : 'EN'}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Selection: kr / en / kh */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-800 dark:text-white block">4. ប្ដូររូបិយប័ណ្ណ (Currency)</span>
                <span className="text-[10px] text-slate-500">ជ្រើសរើស $ USD, ៛ KHR, ₩ KRW</span>
              </div>
              <div className="flex gap-1 bg-white dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                {(['USD', 'KHR', 'KRW'] as Currency[]).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => updateSettings({ currency: curr })}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                      settings.currency === curr
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {curr === 'KHR' ? '៛ KHR' : curr === 'KRW' ? '₩ KRW' : '$ USD'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. User Access Control (កំណត់សិទ្ធិមើលរបាយការណ៍លក់ និងបិទទំព័រតាមអ្នកប្រើប្រាស់) */}
      <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <ShieldAlert size={18} className="text-rose-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              5. User Access Control: កំណត់សិទ្ធិមើលរបាយការណ៍លក់ និងបិទទំព័រតាមអ្នកប្រើប្រាស់ (តាម Email)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              គ្រប់គ្រងសិទ្ធិមើលទិន្នន័យឃ្លាំង និងទំព័រមុខងារនីមួយៗ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Hide other users' sales reports */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="pr-3">
              <span className="font-bold text-slate-800 dark:text-white block">
                Hide other users' sales reports
              </span>
              <span className="text-[11px] text-slate-500">
                (អ្នកប្រើប្រាស់អាចមើលឃើញតែការលក់របស់ខ្លួនតែប៉ុណ្ណោះ)
              </span>
            </div>
            <button
              onClick={toggleHideOtherSales}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.userAccess?.hideOtherUsersSales ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Hide warehouse reports */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="pr-3">
              <span className="font-bold text-slate-800 dark:text-white block">
                Hide warehouse reports
              </span>
              <span className="text-[11px] text-slate-500">
                (បិទមើលឃ្លាំងទំនិញក្នុងទំព័រ Products, POS និងរបាយការណ៍លក់តាមឃ្លាំងក្នុង Orders)
              </span>
            </div>
            <button
              onClick={toggleHideWarehouseReports}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.userAccess?.hideWarehouseReports ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Blocked Pages Toggle Matrix */}
        <div className="pt-2">
          <label className="text-xs font-bold text-slate-800 dark:text-white block mb-2">
            Blocked Pages (ចុចដើម្បីបិទ / បើកការចូលមើលទំព័រនីមួយៗ):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allPageIds.map((p) => {
              const isBlocked = settings.userAccess?.blockedPages?.includes(p.id);

              return (
                <button
                  key={p.id}
                  onClick={() => toggleBlockPage(p.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    isBlocked
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate pr-1">{p.label}</span>
                  {isBlocked ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-600 text-white font-mono flex items-center gap-0.5">
                      <Lock size={10} /> បិទ
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 text-white font-mono flex items-center gap-0.5">
                      <Unlock size={10} /> បើក
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Warehouses, Stores, Groups, Staff, Categories Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ឃ្លាំងទំនិញ (Warehouses) */}
        <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <WarehouseIcon size={18} className="text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ឃ្លាំងទំនិញ (Warehouses)
            </h3>
          </div>

          <form onSubmit={handleAddWh} className="flex gap-2">
            <input
              type="text"
              value={newWhName}
              onChange={(e) => setNewWhName(e.target.value)}
              placeholder="ឈ្មោះឃ្លាំងថ្មី (ឧ. ឃ្លាំងសាខា C)..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-xs btn-3d"
            >
              + បន្ថែម
            </button>
          </form>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {warehouses.map((w) => (
              <div
                key={w.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <span>{w.name}</span>
                {warehouses.length > 1 && (
                  <button
                    onClick={() => deleteWarehouse(w.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ឈ្មោះហាង (Stores / Shops) */}
        <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Store size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ឈ្មោះហាង / សាខា (Stores)
            </h3>
          </div>

          <form onSubmit={handleAddStoreSubmit} className="space-y-2">
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="ឈ្មោះហាង (ឧ. DR-POS សាខាទី៣)..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newStoreAddress}
                onChange={(e) => setNewStoreAddress(e.target.value)}
                placeholder="អាស័យដ្ឋានហាង..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs btn-3d"
              >
                + បន្ថែមហាង
              </button>
            </div>
          </form>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {stores.map((st) => (
              <div
                key={st.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">{st.name}</div>
                  {st.address && <div className="text-[10px] text-slate-400">{st.address}</div>}
                </div>
                {stores.length > 1 && (
                  <button
                    onClick={() => deleteStore(st.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ឈ្មោះ Groups (Customer Groups) */}
        <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Users size={18} className="text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              បន្ថែមឈ្មោះ Groups (Customer Groups)
            </h3>
          </div>

          <form onSubmit={handleAddGroupSubmit} className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="ឈ្មោះ Group ថ្មី (ឧ. អតិថិជនពិសេស VIP)..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold text-xs btn-3d"
            >
              + បន្ថែម
            </button>
          </form>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <span>{g.name}</span>
                {groups.length > 1 && (
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Layers size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              បន្ថែម Categories (ប្រភេទផលិតផល)
            </h3>
          </div>

          <form onSubmit={handleAddCategorySubmit} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="ឈ្មោះ Category ថ្មី..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs btn-3d"
            >
              + បន្ថែម
            </button>
          </form>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <span>{c.name}</span>
                {categories.length > 1 && (
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* បន្ថែមឈ្មោះបុគ្គលិកលក់ (Staff Form in Setting as requested) */}
      <div className="card-3d p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Briefcase size={18} className="text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              បន្ថែមឈ្មោះបុគ្គលិកលក់ ( Staff ) ក្នុង Setting
            </h3>
            <p className="text-[11px] text-slate-500">
              1. ឈ្មោះបុគ្គលិកលក់, 2. មុខដំណេង, 3. លេខទូរស័ព្ទ, 4. Button រក្សារទុក
            </p>
          </div>
        </div>

        <form onSubmit={handleAddStaffSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              1. ឈ្មោះបុគ្គលិកលក់ *
            </label>
            <input
              type="text"
              required
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="ឧ. សុខ សាន្ត"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              2. មុខដំណេង *
            </label>
            <input
              type="text"
              required
              value={newStaffPosition}
              onChange={(e) => setNewStaffPosition(e.target.value)}
              placeholder="ឧ. បុគ្គលិកគិតលុយ"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              3. លេខទូរស័ព្ទ
            </label>
            <input
              type="text"
              value={newStaffPhone}
              onChange={(e) => setNewStaffPhone(e.target.value)}
              placeholder="012 345 678"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs btn-3d shadow-md shadow-indigo-600/20"
            >
              4. Button រក្សារទុក
            </button>
          </div>
        </form>
      </div>

      {/* Buttons: Sign in / Sign out & Delete Account */}
      <div className="card-3d p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            គណនី និងសុវត្ថិភាព (Account & Actions)
          </h4>
          <p className="text-xs text-slate-500">
            ប្តូរគណនី Gmail ឬលុបគណនីចេញពីម៉ាស៊ីនបម្រើ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAuthModal}
            className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 btn-3d"
          >
            Button Sign in / Switch Account
          </button>

          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs btn-3d flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Button Sign out</span>
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 btn-3d flex items-center gap-1.5"
          >
            <AlertOctagon size={14} />
            <span>Button Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Account Modal Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900 overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertOctagon size={24} />
              <h3 className="text-sm font-bold">បញ្ជាក់ការលុបគណនី (Delete Account)</h3>
            </div>

            <p className="text-slate-600 dark:text-slate-400">
              តើអ្នកពិតជាចង់លុបគណនី {user?.email} និងរាល់ទិន្នន័យទាំងអស់ជាអចិន្ត្រៃយ៍មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់ថយក្រោយបានឡើយ។
            </p>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                សូមបញ្ចូលពាក្យសម្ងាត់ដើម្បីបញ្ជាក់:
              </label>
              <input
                type="password"
                value={deletePass}
                onChange={(e) => setDeletePass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-xs"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await deleteAccount(deletePass);
                  if (!res.success) {
                    alert(res.error || 'Failed to delete');
                  } else {
                    setIsDeleteOpen(false);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                បាទ/ចាស លុបគណនី
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
