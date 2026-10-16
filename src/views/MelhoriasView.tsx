import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ListTodo
} from 'lucide-react';
import type { UserImprovements, ImprovementItem } from '../types';

interface MelhoriasViewProps {
  improvements: UserImprovements;
  onUpdateImprovements: (updated: UserImprovements) => void;
}

interface ImprovementBoxProps {
  title: string;
  items: ImprovementItem[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
}

const ImprovementBox: React.FC<ImprovementBoxProps> = ({
  title,
  items,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [inputText, setInputText] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInputText('');
  };

  const startEdit = (item: ImprovementItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingText.trim();
    if (trimmed) {
      onEdit(id, trimmed);
    }
    setEditingId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const displayedItems = hideCompleted ? items.filter((item) => !item.completed) : items;
  const completedCount = items.filter((item) => item.completed).length;

  return (
    <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] rounded-xl p-4 shadow-xs space-y-3 flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 dark:text-ice-100 uppercase tracking-wide">
            {title}
          </h2>
          <span className="text-xs font-mono text-slate-400 dark:text-neutral-500">
            {items.length > 0 ? `${items.length - completedCount}/${items.length}` : '0'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setHideCompleted(!hideCompleted)}
          className={`px-2 py-1 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors shadow-2xs ${
            hideCompleted
              ? 'bg-[#ececeb] dark:bg-[#2a2a2a] border-slate-300 dark:border-[#444] text-slate-900 dark:text-white'
              : 'bg-white dark:bg-[#252525] border-slate-200 dark:border-[#383838] text-slate-600 dark:text-neutral-400 hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e]'
          }`}
          title={hideCompleted ? 'Exibir itens concluídos' : 'Ocultar itens concluídos'}
        >
          {hideCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{hideCompleted ? 'Ocultando concluídos' : 'Ocultar concluídos'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#383838] bg-slate-50/50 dark:bg-[#1a1a1a] text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-slate-400 dark:focus:border-[#555] transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="h-8 px-3 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-neutral-100 transition-colors shadow-2xs flex items-center justify-center shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[220px]">
        {displayedItems.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs text-slate-400 dark:text-neutral-500">
            {items.length === 0 ? 'Nenhuma melhoria adicionada' : 'Nenhuma tarefa pendente'}
          </div>
        ) : (
          displayedItems.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id}
                className={`group flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                  item.completed
                    ? 'border-transparent bg-slate-50/50 dark:bg-[#191919] opacity-70'
                    : 'border-slate-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1f1f1f] hover:border-slate-200 dark:hover:border-[#333]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className="mt-0.5 text-slate-400 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-white shrink-0 transition-colors"
                >
                  {item.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(item.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-[#444] bg-white dark:bg-[#151515] text-slate-800 dark:text-neutral-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="p-1 rounded text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#2c2c2c]"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-1 rounded text-slate-400 dark:text-neutral-500 hover:bg-slate-100 dark:hover:bg-[#2c2c2c]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      onClick={() => startEdit(item)}
                      className={`flex-1 text-xs leading-relaxed break-words cursor-pointer select-text ${
                        item.completed
                          ? 'line-through text-slate-400 dark:text-neutral-500'
                          : 'text-slate-800 dark:text-neutral-200'
                      }`}
                    >
                      {item.text}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const MelhoriasView: React.FC<MelhoriasViewProps> = ({
  improvements,
  onUpdateImprovements,
}) => {
  const handleAddItem = (category: 'prontuario' | 'receituario', text: string) => {
    const newItem: ImprovementItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    const updated: UserImprovements = {
      ...improvements,
      [category]: [newItem, ...(improvements[category] || [])],
    };
    onUpdateImprovements(updated);
  };

  const handleToggleItem = (category: 'prontuario' | 'receituario', id: string) => {
    const updatedList = (improvements[category] || []).map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const updated: UserImprovements = {
      ...improvements,
      [category]: updatedList,
    };
    onUpdateImprovements(updated);
  };

  const handleEditItem = (category: 'prontuario' | 'receituario', id: string, newText: string) => {
    const updatedList = (improvements[category] || []).map((item) =>
      item.id === id ? { ...item, text: newText } : item
    );
    const updated: UserImprovements = {
      ...improvements,
      [category]: updatedList,
    };
    onUpdateImprovements(updated);
  };

  const handleDeleteItem = (category: 'prontuario' | 'receituario', id: string) => {
    const updatedList = (improvements[category] || []).filter((item) => item.id !== id);
    const updated: UserImprovements = {
      ...improvements,
      [category]: updatedList,
    };
    onUpdateImprovements(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#ececeb] dark:border-[#333]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-ice-200 shadow-2xs">
            <ListTodo className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-ice-50 uppercase tracking-wide">
            MELHORIAS
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ImprovementBox
          title="Melhorias no Prontuário"
          items={improvements.prontuario || []}
          onAdd={(text) => handleAddItem('prontuario', text)}
          onToggle={(id) => handleToggleItem('prontuario', id)}
          onEdit={(id, newText) => handleEditItem('prontuario', id, newText)}
          onDelete={(id) => handleDeleteItem('prontuario', id)}
        />

        <ImprovementBox
          title="Melhorias no Receituário"
          items={improvements.receituario || []}
          onAdd={(text) => handleAddItem('receituario', text)}
          onToggle={(id) => handleToggleItem('receituario', id)}
          onEdit={(id, newText) => handleEditItem('receituario', id, newText)}
          onDelete={(id) => handleDeleteItem('receituario', id)}
        />
      </div>
    </div>
  );
};
