import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './LabourCodes.css';

function LabourCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [deletingCode, setDeletingCode] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ code: '', description: '', time: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'labourCodes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.code.localeCompare(b.code));
      setCodes(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.description.trim() || !form.time) {
      setError('All fields are required.');
      return;
    }
    if (editingCode) {
      await updateDoc(doc(db, 'labourCodes', editingCode.id), {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        time: parseFloat(form.time),
      });
    } else {
      await addDoc(collection(db, 'labourCodes'), {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        time: parseFloat(form.time),
      });
    }
    resetForm();
  };

  const handleEdit = (lc) => {
    setEditingCode(lc);
    setForm({ code: lc.code, description: lc.description, time: lc.time.toString() });
    setError('');
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteDoc(doc(db, 'labourCodes', deletingCode.id));
    setDeletingCode(null);
  };

  const resetForm = () => {
    setForm({ code: '', description: '', time: '' });
    setEditingCode(null);
    setError('');
    setShowForm(false);
  };

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-loading">Loading labour codes...</div>;

  return (
    <div className="labour-page">
      <div className="page-header">
        <div>
          <h1>Labour Codes</h1>
          <p className="page-subtitle">{codes.length} codes in your reference list</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Code</button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by code or description..."
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingCode ? 'Edit Labour Code' : 'Add Labour Code'}</h2>
            {error && <div className="form-error">{error}</div>}
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => { setForm({ ...form, code: e.target.value }); setError(''); }}
                placeholder="e.g. 29C001 or F4V44 6245"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={e => { setForm({ ...form, description: e.target.value }); setError(''); }}
                placeholder="e.g. Diagnosis with software"
              />
            </div>
            <div className="form-group">
              <label>Time (hours) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.time}
                onChange={e => { setForm({ ...form, time: e.target.value }); setError(''); }}
                placeholder="e.g. 0.2 or 5"
              />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={resetForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingCode ? 'Save Changes' : 'Add Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingCode && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h2>Delete Labour Code</h2>
            <p className="modal-warning">
              Are you sure you want to delete <strong>{deletingCode.code}</strong>? This action cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDeletingCode(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="labour-table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {search ? `No codes found for "${search}"` : 'No labour codes yet. Add your first one!'}
          </div>
        ) : (
          <table className="labour-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Time (h)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lc => (
                <tr key={lc.id}>
                  <td className="code-cell">{lc.code}</td>
                  <td className="desc-cell">{lc.description}</td>
                  <td className="time-cell">{lc.time}</td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => handleEdit(lc)}>Edit</button>
                    <button className="btn-delete" onClick={() => setDeletingCode(lc)}>Delete</button>
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

export default LabourCodes;
