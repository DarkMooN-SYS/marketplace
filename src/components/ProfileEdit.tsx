import React, { useRef } from "react";

interface ProfileEditProps {
  avatar: string;
  name: string;
  onAvatarChange: (avatar: string) => void;
  onNameChange: (name: string) => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ avatar, name, onAvatarChange, onNameChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex flex-col items-center">
        <img
          src={avatar}
          alt="Avatar"
          className="w-24 h-24 rounded-full object-cover border-4 border-border-main bg-bg-main shadow-lg"
        />
        <button
          type="button"
          className="absolute bottom-2 right-2 bg-bg-main border border-border-main rounded-full p-2 hover:bg-btn-hover"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Зураг засах"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev: ProgressEvent<FileReader>) => {
                onAvatarChange(ev.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </div>
      <div className="relative w-full max-w-xs flex items-center">
        <input
          ref={nameInputRef}
          className="font-bold text-lg text-text-main bg-bg-main border border-border-main rounded px-3 py-1 text-center w-full"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          maxLength={32}
          placeholder="Нэрээ оруулна уу"
          id="name-input"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-bg-main border border-border-main rounded-full p-2 hover:bg-btn-hover"
          onClick={() => nameInputRef.current?.focus()}
          aria-label="Нэр засах"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
        </button>
      </div>
    </div>
  );
};

export default ProfileEdit;
