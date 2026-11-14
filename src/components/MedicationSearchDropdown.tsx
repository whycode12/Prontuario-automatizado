import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import {
  ensureReceituarioDb,
  isReceituarioLoaded,
  searchPrescricaoInterna,
  searchPrescricaoDomiciliar
} from '../services/receituarioService';
import type { PrescricaoOption } from '../types/receituario';

interface MedicationSearchDropdownProps {
  boxType: 'interna' | 'domiciliar';
  peso?: string;
  onSelectMedication: (option: PrescricaoOption) => void;
}

export const MedicationSearchDropdown: React.FC<MedicationSearchDropdownProps> = ({
  boxType,
  peso,
  onSelectMedication
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isDbLoaded, setIsDbLoaded] = useState(isReceituarioLoaded());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDbLoaded) {
      ensureReceituarioDb().then(() => setIsDbLoaded(true));
    }
  }, [isDbLoaded]);

  const options: PrescricaoOption[] = React.useMemo(() => {
    if (!isDbLoaded) return [];
    if (boxType === 'interna') {
      return searchPrescricaoInterna(query);
    }
    return searchPrescricaoDomiciliar(query, peso);
  }, [boxType, query, peso, isDbLoaded]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: PrescricaoOption) => {
    onSelectMedication(option);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[selectedIndex]) {
        handleSelect(options[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!isDbLoaded) {
              ensureReceituarioDb().then(() => setIsDbLoaded(true));
            }
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="w-full text-xs bg-white dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-md pl-8 pr-7 py-1 text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 left-0 sm:left-auto sm:w-80 md:w-96 mt-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 dark:text-neutral-500 text-center">
              Nenhuma medicação encontrada
            </div>
          ) : (
            options.map((opt, idx) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 transition-colors flex flex-col gap-0.5 ${
                  selectedIndex === idx
                    ? 'bg-slate-100/70 dark:bg-navy-800'
                    : 'hover:bg-slate-50 dark:hover:bg-navy-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900 dark:text-ice-100 truncate">
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-950 text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-slate-800">
                      {opt.badge}
                    </span>
                  )}
                </div>
                {opt.subtitle && (
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                    {opt.subtitle}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
