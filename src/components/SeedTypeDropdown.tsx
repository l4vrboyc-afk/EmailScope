import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Mail, Globe, User, Server, Phone, Link2 } from 'lucide-react';
import type { SeedType } from '../api/types';

interface SeedOption {
  value: SeedType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}

const SEED_OPTIONS: SeedOption[] = [
  { value: 'email',    label: 'Email',       icon: Mail,   hint: 'name@target.com' },
  { value: 'url',      label: 'URL / Link',  icon: Link2,  hint: 'https://example.com/login' },
  { value: 'domain',   label: 'Domain',      icon: Globe,  hint: 'target.com' },
  { value: 'ip',       label: 'IP Address',  icon: Server, hint: '192.0.2.1' },
  { value: 'username', label: 'Username',    icon: User,   hint: 'handle / alias' },
  { value: 'phone',    label: 'Phone',       icon: Phone,  hint: '+1 555 000 0000' },
];

interface SeedTypeDropdownProps {
  value: SeedType;
  onChange: (val: SeedType) => void;
  size?: 'sm' | 'md';
}

export default function SeedTypeDropdown({ value, onChange, size = 'sm' }: SeedTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SEED_OPTIONS.find((opt) => opt.value === value) || SEED_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isSmall = size === 'sm';

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`bg-black/90 border border-white/30 rounded-lg flex items-center justify-between gap-2 font-mono uppercase tracking-widest text-white/90 hover:border-white/60 hover:text-white transition-all focus:outline-none focus:border-white ${
          isSmall ? 'px-3 py-2 text-[10px]' : 'px-3.5 py-2 text-[11px]'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5">
          <CurrentIcon className={isSmall ? 'w-3 h-3 text-white/60' : 'w-3.5 h-3.5 text-white/60'} />
          <span className="font-semibold">{currentOption.label}</span>
        </span>
        <ChevronDown
          className={`text-white/50 transition-transform duration-200 ${
            isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } ${isOpen ? 'rotate-180 text-white' : ''}`}
        />
      </button>

      {/* Black Dropdown Menu List */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-black/95 border border-white/25 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden py-1"
        >
          <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-white/40 border-b border-white/10">
            Target Seed Type
          </div>
          {SEED_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left font-mono transition-colors text-white ${
                  isSelected
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-white/50'}`} />
                  <div>
                    <span className="block uppercase tracking-wider text-[10px]">
                      {option.label}
                    </span>
                    <span className="block text-[8px] text-white/40 tracking-normal font-normal">
                      {option.hint}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
