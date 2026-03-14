import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ClaimDetail from './ClaimDetail';
import './Claims.css';

export const BASKETS = [
  { id: 'ready_for_approval', label: 'Ready for Approval', color: '#f59e0b' },
  { id: 'pending', label: 'Pending', color: '#3b82f6' },
  { id: 'pending_editing', label: 'Pending Editing', color: '#f97316' },
  { id: 'feedback_required', label: 'Feedback Required', color: '#ef4444' },
  { id: 'rejection', label: 'Rejection', color: '#dc2626' },
  { id: 'wo_not_complete', label: 'WO Not Complete', color: '#6b7280' },
  { id: 'question', label: 'Question', color: '#8b5cf6' },
  { id: 'auto_approved', label: 'Auto Approved', color: '#10b981' },
  { id: 'warranty_done', label: 'Warranty Claim Done', color: '#059669' },
  { id: 'closed', label: 'Closed', color: '#1f2937' },
];

export const FLAGS = [
  { id: 'rsa', label: 'RSA', icon: '🚨' },
  { id: 'waiting_dealer', label: 'Waiting on Dealer', icon: '⏳' },
  { id: 'check_boss', label: 'Check with Boss', icon: '👆' },
  { id: 'ready_approval', label: 'Ready for Approval', icon: '✅' },
  { id: 'difficult', label: 'Difficult', icon: '⚠️' },
];

export const DIFFICULTIES = [
  { value: 1, label: 'Low', color: '#10b981' },
  { value: 2, label: 'Medium', color: '#f59e0b' },
  { value: 3, label: 'High', color: '#ef4444' },
];

export function BasketBadge({ basketId }) {
  const basket = BASKETS.find(b => b.id === basketId);
  if (!basket) return <span className="basket-badge basket-new">New</span>;
  return (
    <span className="basket-badge" style={{ background: basket.color + '18', color: basket.color, border: `1px solid ${basket.color}35` }}>
      {basket.label}
    </span>
  );
}

function parseIcarDate(str) {
  if (!str) return '';
  const parts = str.trim().split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  const fullYear = parseInt(y) < 50 ? `20${y}` : `19${y}`;
  return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function QuickAddModal({ dealers, onSave, onClose }) {
  const [form, setForm] = useState({ woNumber: '', woDate: '', dealerId: '', licensePlate: '', vin: '' });
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!form.woNumber.trim() || !form.woDate || !form.dealerId) {
      setError('WO Number, WO Date and Dealer are required.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Quick Add Workorder</h2>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>WO Number *</label>
          <input type="text" value={form.woNumber} onChange={e => setForm({ ...form, woNumber: e.target.value })} placeholder="e.g. 25402303" autoFocus />
        </div>
        <div className="form-group">
          <label>WO Date *</label>
          <input type="date" value={form.woDate} onChange={e => setForm({ ...form, woDate: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Dealer *</label>
          <select value={form.dealerId} onChange={e => setForm({ ...form, dealerId: e.target.value })}>
            <option value="">Select dealer...</option>
            {dealers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>License Plate</label>
          <input type="text" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} placeholder="e.g. 1-ABC-234" />
        </div>
        <div className="form-group">
          <label>VIN <span className="label-optional">(optional, add later)</span></label>
          <input type="text" value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} placeholder="Truck VIN" />
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Add Workorder</button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ dealers, onSave, onClose }) {
  const [step, setStep] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState([]);
  const [dealerId, setDealerId] = useState('');

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
              {
                type: 'text',
                text: `This is a screenshot from ICAR, a Ford warranty management system. Extract all rows from the table.
The columns are: Kenteken (license plate), Klant (ignore this), Geopend (date in DD/MM/YY format), Werkorder (WO number - bold numbers).
Return ONLY a JSON array, no markdown, no explanation:
[{"licensePlate":"2DJL322","woDate":"28/11/25","woNumber":"25402303"},...]`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const rows = JSON.parse(clean);

      setExtracted(rows.map(r => ({ ...r, woDate: parseIcarDate(r.woDate), selected: true })));
      setStep('review');
    } catch (err) {
      setError('Could not read the screenshot. Please try again or use Quick Add.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (idx) => setExtracted(extracted.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
  const updateRow = (idx, field, value) => setExtracted(extracted.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleSave = () => {
    if (!dealerId) { setError('Please select a dealer for these workorders.'); return; }
    const selected = extracted.filter(r => r.selected);
    if (selected.length === 0) { setError('Select at least one workorder.'); return; }
    onSave(selected.map(r => ({ woNumber: r.woNumber, woDate: r.woDate, licensePlate: r.licensePlate, dealerId, vin: '' })));
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-large">
        <h2>Import from ICAR Screenshot</h2>

        {step === 'upload' && (
          <>
            <p className="modal-subtitle">Upload a screenshot from ICAR. The AI will extract WO numbers, dates and license plates automatically.</p>
            {error && <div className="form-error">{error}</div>}
            <div className="form-group">
              <label>Dealer (applies to all imported WOs) *</label>
              <select value={dealerId} onChange={e => setDealerId(e.target.value)}>
                <option value="">Select dealer...</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </div>
            <div className="upload-area">
              {loading ? (
                <div className="upload-loading">
                  <div className="spinner" />
                  <p>Reading screenshot...</p>
                </div>
              ) : (
                <>
                  <p>📸 Click to upload ICAR screenshot</p>
                  <p className="upload-hint">{dealerId ? 'Select your screenshot to begin' : 'Select a dealer first'}</p>
                  <input type="file" accept="image/*" onChange={handleImage} disabled={!dealerId} className="upload-input" />
                </>
              )}
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <p className="modal-subtitle">Review and correct the extracted data before saving.</p>
            {error && <div className="form-error">{error}</div>}
            <div className="import-table-wrapper">
              <table className="import-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>License Plate</th>
                    <th>WO Date</th>
                    <th>WO Number</th>
                  </tr>
                </thead>
                <tbody>
                  {extracted.map((row, idx) => (
                    <tr key={idx} className={!row.selected ? 'row-deselected' : ''}>
                      <td><input type="checkbox" checked={row.selected} onChange={() => toggleRow(idx)} /></td>
                      <td><input type="text" value={row.licensePlate} onChange={e => updateRow(idx, 'licensePlate', e.target.value)} /></td>
                      <td><input type="date" value={row.woDate} onChange={e => updateRow(idx, 'woDate', e.target.value)} /></td>
                      <td><input type="text" value={row.woNumber} onChange={e => updateRow(idx, 'woNumber', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="import-summary">{extracted.filter(r => r.selected).length} of {extracted.length} workorders selected</div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-secondary" onClick={() => setStep('upload')}>← Back</button>
              <button className="btn-primary" onClick={handleSave}>Import Selected</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteModal({ claim, onConfirm, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal modal-small">
        <h2>Delete Workorder</h2>
        <p className="modal-warning">Are you sure you want to delete <strong>WO {claim.woNumber}</strong>? This action cannot be undone.</p>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Claims() {
  const [claims, setClaims] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingClaim, setDeletingClaim] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [filterBasket, setFilterBasket] = useState('all');
  const [filterDealer, setFilterDealer] = useState('all');

  useEffect(() => {
    const unsubClaims = onSnapshot(collection(db, 'claims'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const keyA = (a.vin || a.licensePlate || '').toUpperCase();
        const keyB = (b.vin || b.licensePlate || '').toUpperCase();
        if (keyA !== keyB) return keyA.localeCompare(keyB);
        return new Date(a.woDate) - new Date(b.woDate);
      });
      setClaims(data);
      setLoading(false);
    });

    const unsubDealers = onSnapshot(collection(db, 'dealers'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.code.localeCompare(b.code));
      setDealers(data);
    });

    return () => { unsubClaims(); unsubDealers(); };
  }, []);

  const createClaim = async (formData) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'claims'), {
      ...formData,
      basket: null,
      flags: [],
      difficulty: 1,
      commentary: '',
      questions: '',
      about: '',
      claimCards: [{ claimCardNumber: '', isRSA: false, claimNumbers: [''] }],
      basketHistory: [],
      basketChangedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleQuickAdd = async (formData) => { await createClaim(formData); setShowQuickAdd(false); };
  const handleImport = async (rows) => { for (const row of rows) await createClaim(row); setShowImport(false); };
  const handleDeleteConfirm = async () => { await deleteDoc(doc(db, 'claims', deletingClaim.id)); setDeletingClaim(null); };

  const getDealerLabel = (id) => {
    const d = dealers.find(d => d.id === id);
    return d ? `${d.code} — ${d.name}` : '—';
  };

  const filtered = claims.filter(c => {
    if (filterBasket === 'none' && c.basket) return false;
    if (filterBasket !== 'all' && filterBasket !== 'none' && c.basket !== filterBasket) return false;
    if (filterDealer !== 'all' && c.dealerId !== filterDealer) return false;
    return true;
  });

  if (selectedClaim) {
    const claim = claims.find(c => c.id === selectedClaim);
    if (claim) return <ClaimDetail claim={claim} dealers={dealers} onBack={() => setSelectedClaim(null)} onDelete={(c) => { setSelectedClaim(null); setDeletingClaim(c); }} />;
  }

  if (loading) return <div className="page-loading">Loading claims...</div>;

  // Group by VIN or license plate
  const groups = [];
  let currentKey = null;
  filtered.forEach(claim => {
    const key = (claim.vin || claim.licensePlate || '—').toUpperCase();
    if (key !== currentKey) { groups.push({ key, claims: [claim] }); currentKey = key; }
    else groups[groups.length - 1].claims.push(claim);
  });

  return (
    <div className="claims-page">
      <div className="page-header">
        <div>
          <h1>Claims</h1>
          <p className="page-subtitle">{filtered.length} workorders{filterBasket !== 'all' || filterDealer !== 'all' ? ' (filtered)' : ''}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>📸 Import from ICAR</button>
          <button className="btn-primary" onClick={() => setShowQuickAdd(true)}>+ Add Workorder</button>
        </div>
      </div>

      <div className="filters-bar">
        <select value={filterBasket} onChange={e => setFilterBasket(e.target.value)}>
          <option value="all">All Baskets</option>
          <option value="none">No Basket (New)</option>
          {BASKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select value={filterDealer} onChange={e => setFilterDealer(e.target.value)}>
          <option value="all">All Dealers</option>
          {dealers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
        </select>
      </div>

      <div className="claims-list">
        {filtered.length === 0 && <div className="empty-state">No workorders found. Add your first one or import from ICAR!</div>}
        {groups.map(group => (
          <div key={group.key} className="claim-group">
            <div className="claim-group-header">
              🚛 {group.key}
              <span className="group-count">{group.claims.length} WO{group.claims.length !== 1 ? 's' : ''}</span>
            </div>
            {group.claims.map(claim => (
              <div key={claim.id} className="claim-row" onClick={() => setSelectedClaim(claim.id)}>
                <div className="claim-row-left">
                  <span className="wo-number">WO {claim.woNumber}</span>
                  <span className="wo-date">{claim.woDate ? new Date(claim.woDate).toLocaleDateString('en-GB') : '—'}</span>
                  <span className="wo-dealer">{getDealerLabel(claim.dealerId)}</span>
                  {claim.about && <span className="wo-about">{claim.about}</span>}
                </div>
                <div className="claim-row-right">
                  {claim.flags?.map(flagId => {
                    const flag = FLAGS.find(f => f.id === flagId);
                    return flag ? <span key={flagId} className="flag-tag" title={flag.label}>{flag.icon}</span> : null;
                  })}
                  <BasketBadge basketId={claim.basket} />
                  <button className="btn-delete-row" onClick={e => { e.stopPropagation(); setDeletingClaim(claim); }} title="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showQuickAdd && <QuickAddModal dealers={dealers} onSave={handleQuickAdd} onClose={() => setShowQuickAdd(false)} />}
      {showImport && <ImportModal dealers={dealers} onSave={handleImport} onClose={() => setShowImport(false)} />}
      {deletingClaim && <DeleteModal claim={deletingClaim} onConfirm={handleDeleteConfirm} onClose={() => setDeletingClaim(null)} />}
    </div>
  );
}

export default Claims;
