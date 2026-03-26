'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useCategories, type Category } from '@/hooks/useCategories'
import { createClient } from '@/lib/supabase/client'

const PRESET_COLORS = [
  '#6b7280', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

export default function CategoriasPage() {
  const { categories, rules, refetch: refetchCategories, addCategory, updateCategory, deleteCategory } = useCategories()
  const [addingRuleForCatId, setAddingRuleForCatId] = useState<string | null>(null)
  const [newRuleKeyword, setNewRuleKeyword] = useState('')
  const [showNewCatForm, setShowNewCatForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [newCatIcon, setNewCatIcon] = useState('📂')
  const [savingCat, setSavingCat] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatIcon, setEditCatIcon] = useState('')
  const [editCatType, setEditCatType] = useState<'expense' | 'income'>('expense')
  const [editCatColor, setEditCatColor] = useState(PRESET_COLORS[0])
  const [savingEditCat, setSavingEditCat] = useState(false)
  const lastTap = useRef<Record<string, number>>({})

  function openEditCat(cat: Category) {
    setEditingCat(cat)
    setEditCatName(cat.name)
    setEditCatIcon(cat.icon ?? '📂')
    setEditCatType(cat.type as 'expense' | 'income')
    setEditCatColor(cat.color ?? PRESET_COLORS[0])
  }

  function handleCatTouchEnd(cat: Category) {
    const now = Date.now()
    if (now - (lastTap.current[cat.id] ?? 0) < 300) openEditCat(cat)
    lastTap.current[cat.id] = now
  }

  async function handleEditCatSave() {
    if (!editingCat || !editCatName.trim()) return
    setSavingEditCat(true)
    await updateCategory(editingCat.id, {
      name: editCatName.trim(),
      icon: editCatIcon,
      type: editCatType,
      color: editCatColor,
    })
    setSavingEditCat(false)
    setEditingCat(null)
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    await addCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
    })
    setNewCatName('')
    setNewCatType('expense')
    setNewCatColor(PRESET_COLORS[0])
    setNewCatIcon('📂')
    setShowNewCatForm(false)
    setSavingCat(false)
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <div className="px-4 flex items-center gap-3">
        <Link href="/config" className="text-blue-600 flex items-center gap-1 text-sm">
          ‹ Configurações
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 px-4">Categorias e Regras</h1>

      <section className="px-4">
        <div className="flex flex-col gap-3">
          {categories.map(cat => {
            const catRules = rules.filter(r => r.category_id === cat.id)
            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div
                  className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                  onDoubleClick={() => openEditCat(cat)}
                  onTouchEnd={() => handleCatTouchEnd(cat)}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                  <span className="text-xs text-gray-400">{cat.type === 'expense' ? 'Despesa' : 'Rendimento'}</span>
                  <span
                    className="w-3 h-3 rounded-full inline-block ml-auto flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-gray-300 hover:text-red-400 text-sm ml-1"
                    title="Eliminar categoria"
                  >
                    🗑
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {catRules.map(rule => (
                    <span key={rule.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">
                      {rule.keyword}
                      <button
                        onClick={async () => {
                          const supabase = createClient()
                          await (supabase.from('category_rules') as any).delete().eq('id', rule.id)
                          refetchCategories()
                        }}
                        className="hover:text-red-500 ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                {addingRuleForCatId === cat.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newRuleKeyword}
                      onChange={e => setNewRuleKeyword(e.target.value)}
                      placeholder="keyword"
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && newRuleKeyword.trim()) {
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (user) {
                            await (supabase.from('category_rules') as any).insert({
                              user_id: user.id,
                              keyword: newRuleKeyword.trim().toLowerCase(),
                              category_id: cat.id,
                              priority: 1,
                            })
                            refetchCategories()
                          }
                          setNewRuleKeyword('')
                          setAddingRuleForCatId(null)
                        }
                        if (e.key === 'Escape') setAddingRuleForCatId(null)
                      }}
                    />
                    <button onClick={() => setAddingRuleForCatId(null)} className="text-gray-400 text-sm">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingRuleForCatId(cat.id); setNewRuleKeyword('') }}
                    className="text-blue-600 text-xs"
                  >
                    + Regra
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {showNewCatForm ? (
          <div className="mt-3 bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
                placeholder="📂"
                className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-center text-lg"
              />
              <input
                autoFocus
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nome da categoria"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <select
              value={newCatType}
              onChange={e => setNewCatType(e.target.value as 'expense' | 'income')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="expense">Despesa</option>
              <option value="income">Rendimento</option>
            </select>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Cor</p>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCatColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${newCatColor === color ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                disabled={savingCat || !newCatName.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
              >
                {savingCat ? 'A guardar…' : 'Guardar'}
              </button>
              <button
                onClick={() => setShowNewCatForm(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCatForm(true)}
            className="w-full mt-3 py-3 border-2 border-dashed border-blue-200 text-blue-600 text-sm font-medium rounded-xl"
          >
            + Nova categoria
          </button>
        )}
      </section>

      {editingCat && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingCat(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-md mx-auto">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Editar categoria</p>
              <button onClick={() => setEditingCat(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="px-4 py-4 pb-8 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  value={editCatIcon}
                  onChange={e => setEditCatIcon(e.target.value)}
                  placeholder="📂"
                  className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-center text-lg"
                />
                <input
                  autoFocus
                  value={editCatName}
                  onChange={e => setEditCatName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <select
                value={editCatType}
                onChange={e => setEditCatType(e.target.value as 'expense' | 'income')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="expense">Despesa</option>
                <option value="income">Rendimento</option>
              </select>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditCatColor(color)}
                      className={`w-7 h-7 rounded-full border-2 ${editCatColor === color ? 'border-gray-800' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEditCatSave}
                  disabled={savingEditCat || !editCatName.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
                >
                  {savingEditCat ? 'A guardar…' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
