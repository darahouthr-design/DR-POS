import React from 'react';
import { Logo } from '../components/Logo.tsx';
import { Icon3D } from '../components/icons/Icon3D.tsx';
import {
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Smartphone,
  Monitor,
  Heart,
  Code2,
  Layers,
  MapPin,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const features = [
    {
      title: 'លក់ទំនិញយ៉ាងលឿន (បញ្ចូលការលក់ថ្មី)',
      desc: 'ប្រព័ន្ធ POS ល្បឿនលឿន ស្កេនបាកូដតាមកាមេរ៉ា និងគណនាប្រាក់ភ្លាមៗ',
      icon: 'pos' as const,
    },
    {
      title: 'គ្រប់គ្រងស្តុកទំនិញ និងប្រវត្តិស្តុកចាស់',
      desc: 'តាមដានចំនួនស្តុកជាក់ស្តែង និងកត់ត្រាប្រវត្តិការបញ្ចូលស្តុកថ្មី Stock Log',
      icon: 'stock_log' as const,
    },
    {
      title: 'បន្ថែម កែ លុប ទំនិញ និងបុគ្គលិក',
      desc: 'គ្រប់គ្រងផលិតផល បុគ្គលិកលក់ ឃ្លាំងទំនិញ និងក្រុមអតិថិជនបានពេញលេញ',
      icon: 'products' as const,
    },
    {
      title: 'ធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិ (Realtime Sync)',
      desc: 'ដំណើរការ Realtime ប្រើបានច្រើនឧបករណ៍ក្នុងពេលតែមួយ (Multi-Device)',
      icon: 'about' as const,
    },
    {
      title: 'ជូនដំណឹងស្តុកជិតអស់ (ស្តុក < 10)',
      desc: 'ប្រព័ន្ធ Notification ផ្ដល់សញ្ញាព្រមានភ្លាមៗពេលទំនិញនៅសល់តិចជាង ១០',
      icon: 'bell' as const,
    },
    {
      title: 'មើលរបាយការណ៍ចំណូល ប្រាក់ចំណេញ និងបុគ្គលិកលក់ល្អបំផុត',
      desc: 'វិភាគស្ថិតិលក់តាមថ្ងៃ/ខែ/ឆ្នាំ និងតាមដានសមត្ថភាពបុគ្គលិកម្នាក់ៗ',
      icon: 'track_staff' as const,
    },
    {
      title: 'ប្រើបានទាំងកុំព្យូទ័រ និងទូរស័ព្ទ (Responsive POS)',
      desc: 'គាំទ្រកុំព្យូទ័រ Cashier, Tablet iPad, និងទូរស័ព្ទដៃស្មាតហ្វូនគ្រប់ប្រភេទ',
      icon: 'orders' as const,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-16 max-w-5xl mx-auto">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-sky-900 p-8 sm:p-10 text-white shadow-2xl text-center">
        <div className="relative z-10 flex flex-col items-center">
          <Logo size="xl" showSubtitle={false} className="mb-4" />
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
            DR-POS Systems
          </h1>
          <p className="text-sm sm:text-base text-indigo-200 max-w-xl font-medium">
            ប្រព័ន្ធគ្រប់គ្រងការលក់ និងស្តុកទំនិញស្តង់ដារ Realtime Multi-Device Point of Sale System
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-bold text-sky-200 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span>Realtime Sync</span>
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-bold text-emerald-200 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Isolated Gmail Data</span>
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" />
              <span>3D Composed UI</span>
            </span>
          </div>
        </div>
      </div>

      {/* Developer Card (អ្នកអភិវឌ្ឍន៍: ហួត ដារ៉ា, អ្នកអភិវឌ្ឍន៍ពេញម៉ោង · កម្ពុជា) */}
      <div className="card-3d p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-indigo-200 dark:border-indigo-900 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-sky-600 to-emerald-500 p-1 shadow-xl shadow-indigo-500/25">
              <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl">
                HD
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] shadow">
              PRO
            </span>
          </div>

          <div className="text-center sm:text-left flex-1">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
              អ្នកអភិវឌ្ឍន៍ប្រព័ន្ធ (Lead System Developer)
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              ហួត ដារ៉ា (Hout Dara)
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                <Code2 size={15} />
                <span>អ្នកអភិវឌ្ឍន៍ពេញម៉ោង (Full Stack Developer)</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <MapPin size={15} />
                <span>កម្ពុជា (Cambodia 🇰🇭)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
              ជំនាញអភិវឌ្ឍន៍ប្រព័ន្ធ POS, Web Application Realtime, Cloud Integration, និង UI/UX Design កម្រិតខ្ពស់សម្រាប់អាជីវកម្ម
            </p>
          </div>
        </div>
      </div>

      {/* Main Features Grid (មុខងារសំខាន់ៗ) */}
      <div className="card-3d p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            <span>មុខងារសំខាន់ៗ (Core Key Features)</span>
          </h3>
          <p className="text-xs text-slate-500">
            ប្រព័ន្ធត្រូវបានរៀបចំឡើងយ៉ាងសម្រិតសម្រាំងតាមតម្រូវការជាក់ស្តែងនៃអាជីវកម្ម
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3.5 transition-all hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
            >
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex-shrink-0">
                <Icon3D name={feat.icon} size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {feat.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
