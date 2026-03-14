import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './Dealers.css';

function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [deletingDealer, setDeletingDealer] = useState(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'dealers'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.code.localeCompare(b.code));
      setDealers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    if (editingDealer) {
      await updateDoc(doc(db, 'dealers', editingDealer.id), form);
    } else {
      await addDoc(collection(db, 'dealers'), form);
    }
    resetForm();
  };

  const handleEdit = (dealer) => {
    setEditingDealer(dealer);
    setForm({ name: dealer.name, code: dealer.code });
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteDoc(doc(db, 'dealers', deletingDealer.id));
    setDeletingDealer(null);
  };

  const resetForm = () => {
    setForm({ name: '', code: '' });
    setEditingDealer(null);
    setShowForm(false);
  };

  if (loading) return <div className="page-loading">Loading dealers...</div>;

  return (
    <div className="dealers-page">
      <div className="page-header">
        <div>
          <h1>Dealers</h1>
          <p className="page-subtitle">{dealers.length} dealers in your network</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Dealer</button>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingDealer ? 'Edit Dealer' : 'Add Dealer'}</h2>
            <div className="form-group">
              <label>Dealer Code *</label>
              <select value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}>
                <option value="">Select code...</option>
                {['SA1','SA2','SA3','SA4','SA5','SA6','SA7','SA9','SAD','SAX'].map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Dealer Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Garage Janssen"
              />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={resetForm}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingDealer ? 'Save Changes' : 'Add Dealer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDealer && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h2>Delete Dealer</h2>
            <p className="modal-warning">
              Are you sure you want to delete <strong>{deletingDealer.name} ({deletingDealer.code})</strong>? This action cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDeletingDealer(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="dealers-grid">
        {dealers.length === 0 && (
          <div className="empty-state">No dealers yet. Add your first dealer to get started.</div>
        )}
        {dealers.map(dealer => (
          <div key={dealer.id} className="dealer-card">
            <div className="dealer-card-header">
              <span className="dealer-code">{dealer.code}</span>
              <h3>{dealer.name}</h3>
            </div>
            <div className="dealer-card-actions">
              <button className="btn-edit" onClick={() => handleEdit(dealer)}>Edit</button>
              <button className="btn-delete" onClick={() => setDeletingDealer(dealer)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dealers;