import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './Parts.css';

const CATEGORIES = [
  { id: 'oil', label: '🛢️ Oils', description: 'Oils and fluids with barrel/litre info' },
  { id: 'other', label: '🔩 Parts', description: 'General parts reference' },
];

function Parts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [deletingPart, setDeletingPart] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('oil');
  const [form, setForm] = useState({ code: '', name: '', notes: '', category: 'oil' });
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'parts'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.code.localeCompare(b.code));
      setParts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.');
      return;
    }
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      notes: form.notes.trim(),
      category: form.category,
    };
    if (editingPart) {
      await updateDoc(doc(db, 'parts', editingPart.id), payload);
    } else {
      await addDoc(collection(db, 'parts'), payload);
    }
    resetForm();
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setForm({ code: part.code, name: part.name, notes: part.notes || '', category: part.category });
    setError('');
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteDoc(doc(db, 'parts', deletingPart.id));
    setDeletingPart(null);
  };

  const resetForm = () => {
    setForm({ code: '', name: '', notes: '', category: activeCategory });
    setEditingPart(null);
    setError('');
    setShowForm(false);
  };

  const handleAddClick = () => {
    setForm({ code: '', name: '', notes: '', category: activeCategory });
    setShowForm(true);
  };

  const filtered = parts.filter(p => {
    const matchesCategory = p.category === activeCategory;
    const matchesSearch = !search ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <div className="page-loading">Loading parts...</div>;

  return (
    <div className="parts-page">
      <div className="page-header">
        <div>
          <h1>Parts & Oils</h1>
          <p className="page-subtitle">{parts.length} items in your reference list</p>
        </div>
        <button className="btn-primary" onClick={handleAddClick}>+ Add Item</button>
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
          >
            {cat.label}
            <span className="tab-count">{parts.filter(p => p.category === cat.id).length}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${activeCategory === 'oil' ? 'oils' : 'parts'} by code, name or notes...`}
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingPart ? 'Edit Item' : 'Add Item'}</h2>
            {error && <div className="form-error">{error}</div>}
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="oil">🛢️ Oil</option>
                <option value="other">🔩 Part</option>
              </select>
            </div>
            <div className="form-group">
              <label>Part Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => { setForm({ ...form, code: e.target.value }); setError(''); }}
                placeholder="e.g. 1793847"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }}
                placeholder="e.g. Engine Oil 10W-40"
              />
            </div>
            <div className="form-group">
              <label>Notes {form.category === 'oil' ? '(e.g. 208L barrel = 208 litres)' : '(optional)'}</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder={form.category === 'oil'
                  ? 'e.g. 208L per barrel. Use for engine top-up. 1 barrel ≈ 208 litres.'
                  : 'Any useful notes about this part...'}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={resetForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingPart ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingPart && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h2>Delete Item</h2>
            <p className="modal-warning">
              Are you sure you want to delete <strong>{deletingPart.name} ({deletingPart.code})</strong>? This action cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDeletingPart(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Parts list */}
      <div className="parts-table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {search
              ? `No items found for "${search}"`
              : `No ${activeCategory === 'oil' ? 'oils' : 'parts'} yet. Add your first one!`}
          </div>
        ) : (
          <table className="parts-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(part => (
                <tr key={part.id}>
                  <td className="code-cell">{part.code}</td>
                  <td className="name-cell">{part.name}</td>
                  <td className="notes-cell">{part.notes || <span className="no-notes">—</span>}</td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => handleEdit(part)}>Edit</button>
                    <button className="btn-delete" onClick={() => setDeletingPart(part)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Parts;
