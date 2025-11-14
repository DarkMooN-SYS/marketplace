import React, { useRef } from "react";
import { Pencil, UploadCloud, Info } from 'lucide-react';
import { motion } from "framer-motion";

interface ProfileEditProps {
  avatar: string;
  name: string;
  onAvatarChange: (avatar: string) => void;
  onNameChange: (name: string) => void;
  onSave?: (avatar: string, name: string) => void;
}

const EditIcon = () => (
  <Pencil size={20} strokeWidth={2.2} className="text-gray-400 dark:text-gray-300" />
);

const ProfileEdit: React.FC<ProfileEditProps> = ({
  avatar,
  name,
  onAvatarChange,
  onNameChange,
  onSave,
}) => {
  const [localAvatar, setLocalAvatar] = React.useState<string>(avatar);
  const [localName, setLocalName] = React.useState<string>(name);
  
  // Зөвхөн эхний удаа avatar болон name prop-оос утга авна
  // Дараа нь хэрэглэгч засварласан утгыг хадгална
  const isFirstRenderRef = React.useRef(true);
  
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      setLocalAvatar(avatar);
      setLocalName(name);
      isFirstRenderRef.current = false;
    }
  }, [avatar, name]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Зураг эсэхийг шалгах
    if (!file.type.startsWith('image/')) {
      alert('Зөвхөн зураг файл сонгоно уу');
      return;
    }
    
    // Хэмжээ шалгах (5MB хүртэл)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Зургийн хэмжээ 5MB-аас бага байх ёстой');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => {
      if (ev.target?.result) {
        const newAvatar = ev.target.result as string;
        setLocalAvatar(newAvatar);
        onAvatarChange(newAvatar);
      }
    };
    reader.onerror = (error) => {
      console.error('Зураг уншихад алдаа:', error);
      alert('Зураг уншихад алдаа гарлаа. Дахин оролдоно уу.');
    };
    reader.readAsDataURL(file);
    
    // Input-г reset хийж дахин ижил файл сонгох боломжтой болгох
    e.target.value = '';
  };

  return (
    <motion.div
      className="w-full rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] dark:bg-slate-900/80 backdrop-blur-sm shadow-lg text-[var(--color-text-main)] px-5 sm:px-8 py-6 space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="space-y-3">
  <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-300">Профайл засах</p>
        <h2 className="text-xl sm:text-2xl font-semibold">Өөрийн мэдээллээ шинэчлэх</h2>
  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 max-w-xl">
          Профайлын зураг болон нэрний мэдээллээ шинэчилсний дараа хадгалах товч дарж өөрчлөлтийг баталгаажуулна уу.
        </p>
        
        {/* Complete Profile Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('profile:complete'))}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Дэлгэрэнгүй мэдээлэл бөглөх</span>
        </button>
      </header>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative mx-auto sm:mx-0">
            <motion.img
              src={localAvatar || "https://via.placeholder.com/150/cccccc?text=Avatar"}
              alt="Avatar"
              className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl object-cover border-4 border-white/40 dark:border-slate-800 shadow-xl"
              whileHover={{ scale: 1.03 }}
            />
            <button
              type="button"
              aria-label="Зураг засах"
              className="absolute -bottom-2 -right-2 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 md:px-3 py-1 md:py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-blue-700 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-3 h-3 flex-shrink-0" />
              <span>Зураг солих</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="flex-1 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300" htmlFor="name-input">
              Нэр
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                id="name-input"
                value={localName}
                onChange={(e) => {
                  setLocalName(e.target.value);
                  onNameChange(e.target.value);
                }}
                maxLength={32}
                placeholder="Нэрээ оруулна уу"
                className="w-full rounded-2xl border border-[var(--color-border-main)] bg-white/90 dark:bg-slate-900/60 px-4 py-3 text-sm sm:text-base font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
              <button
                type="button"
                aria-label="Нэр засах"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-main)] bg-white/80 dark:bg-slate-800 text-[var(--color-text-main)] dark:text-white hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                onClick={() => nameInputRef.current?.focus()}
              >
                <EditIcon />
              </button>
            </div>
            <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <Info className="h-4 w-4" />
              32 тэмдэгт хүртэл бичих боломжтой. Нэрэндээ цол, албан тушаал нэмэхийг хүсвэл богино хэлбэрээр бичээрэй.
            </p>
          </div>
        </div>
      </div>

      {onSave && (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-[var(--color-border-main)] pt-4">
          <span className="text-sm md:text-base text-slate-500 dark:text-slate-300">
            Хадгалах товч дарснаар өөрчлөлт тань профайл дээр шууд харагдана.
          </span>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 md:px-6 py-1.5 md:py-2 text-sm md:text-base font-semibold text-white shadow-lg hover:bg-blue-700 transition"
            onClick={() => {
              onAvatarChange(localAvatar);
              onNameChange(localName);
              onSave(localAvatar, localName);
            }}
          >
            <UploadCloud className="w-4 h-4 flex-shrink-0" />
            Хадгалах
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileEdit;