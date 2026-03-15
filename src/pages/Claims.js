import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
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

// baskets is now an array
export function BasketBadge({ baskets }) {
  const ids = Array.isArray(baskets) ? baskets : (baskets ? [baskets] : []);
  if (ids.length === 0) return <span className="basket-badge basket-new">New</span>;
  return (
    <div className="basket-badges">
      {ids.map(id => {
        const b = BASKETS.find(b => b.id === id);
        if (!b) return null;
        return (
          <span key={id} className="basket-badge" style={{ background: b.color + '18', color: b.color, border: `1px solid ${b.color}35` }}>
            {b.label}
          </span>
        );
      })}
    </div>
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

function parseTextToRows(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];
  for (const line of lines) {
    if (/kenteken|license|werkorder|datum|date|klant/i.test(line)) continue;
    const parts = line.split(/[\t|;]|\s+-\s+|\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    let licensePlate = '', woDate = '', woNumber = '';
    for (const part of parts) {
      if (/^\d{8}$/.test(part)) { woNumber = part; continue; }
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(part)) { woDate = part; continue; }
      if (/^[A-Z0-9\-]{2,12}$/i.test(part) && !licensePlate && !/^(ford|truck|bv|nv|sa[0-9a-z])/i.test(part)) {
        licensePlate = part.toUpperCase();
      }
    }
    if (woNumber || licensePlate) {
      results.push({ licensePlate, woDate: parseIcarDate(woDate) || woDate, woNumber, selected: true });
    }
  }
  return results;
}

function QuickAddModal({ dealers, existingWoNumbers, onSave, onClose, onOpenExisting }) {
  const [form, setForm] = useState({ woNumber: '', woDate: '', dealerId: '', licensePlate: '', vin: '' });
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);

  const handleSave = () => {
    if (!form.woNumber.trim() || !form.woDate || !form.dealerId) {
      setError('WO Number, WO Date and Dealer are required.');
      return;
    }
    const dup = existingWoNumbers[form.woNumber.trim()];
    if (dup) { setDuplicate(dup); return; }
    onSave(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Quick Add Workorder</h2>
        {error && <div className="form-error">{error}</div>}
        {duplicate && (
          <div className="form-warning">
            WO <strong>{form.woNumber}</strong> already exists.{' '}
            <button className="btn-link-inline" onClick={() => { onClose(); onOpenExisting(duplicate.id); }}>Open it →</button>
          </div>
        )}
        <div className="form-group">
          <label>WO Number *</label>
          <input type="text" value={form.woNumber}
            onChange={e => { setForm({ ...form, woNumber: e.target.value }); setDuplicate(null); setError(''); }}
            placeholder="e.g. 25402303" autoFocus />
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

function ImportModal({ dealers, existingWoNumbers, onSave, onClose }) {
  const [step, setStep] = useState('paste');
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState([]);
  const [dealerId, setDealerId] = useState('');
  const [pastedText, setPastedText] = useState('');

  const handleParse = () => {
    if (!dealerId) { setError('Please select a dealer first.'); return; }
    if (!pastedText.trim()) { setError('Please paste some text first.'); return; }
    const rows = parseTextToRows(pastedText);
    if (rows.length === 0) { setError('Could not find any workorders in the pasted text.'); return; }
    // Mark duplicates
    const marked = rows.map(r => ({ ...r, isDuplicate: !!existingWoNumbers[r.woNumber], selected: !existingWoNumbers[r.woNumber] }));
    setExtracted(marked);
    setError('');
    setStep('review');
  };

  const toggleRow = (idx) => setExtracted(extracted.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
  const updateRow = (idx, field, value) => setExtracted(extracted.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleSave = () => {
    if (!dealerId) { setError('Please select a dealer.'); return; }
    const selected = extracted.filter(r => r.selected && !r.isDuplicate);
    if (selected.length === 0) { setError('No new workorders selected to import.'); return; }
    onSave(selected.map(r => ({ woNumber: r.woNumber, woDate: r.woDate, licensePlate: r.licensePlate, dealerId, vin: '' })));
  };

  const dupeCount = extracted.filter(r => r.isDuplicate).length;

  return (
    <div className="modal-overlay">
      <div className="modal modal-large">
        <h2>Import from ICAR</h2>
        {step === 'paste' && (
          <>
            <p className="modal-subtitle">Ask an AI to extract your ICAR screenshot as text, then paste it here. The format doesn't matter.</p>
            {error && <div className="form-error">{error}</div>}
            <div className="form-group">
              <label>Dealer (applies to all imported WOs) *</label>
              <select value={dealerId} onChange={e => { setDealerId(e.target.value); setError(''); }}>
                <option value="">Select dealer...</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Paste extracted text here *</label>
              <textarea
                value={pastedText}
                onChange={e => { setPastedText(e.target.value); setError(''); }}
                placeholder={`2DJL322 - 28/11/25 - 25402303\n2DDE377 - 28/11/25 - 25402301\n...`}
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleParse}>Parse →</button>
            </div>
          </>
        )}
        {step === 'review' && (
          <>
            <p className="modal-subtitle">Review and correct if needed. Duplicates are highlighted and deselected automatically.</p>
            {error && <div className="form-error">{error}</div>}
            {dupeCount > 0 && <div className="form-warning">{dupeCount} duplicate WO{dupeCount !== 1 ? 's' : ''} found and deselected.</div>}
            <div className="import-table-wrapper">
              <table className="import-table">
                <thead>
                  <tr><th></th><th>License Plate</th><th>WO Date</th><th>WO Number</th><th></th></tr>
                </thead>
                <tbody>
                  {extracted.map((row, idx) => (
                    <tr key={idx} className={row.isDuplicate ? 'row-duplicate' : !row.selected ? 'row-deselected' : ''}>
                      <td><input type="checkbox" checked={row.selected} onChange={() => toggleRow(idx)} disabled={row.isDuplicate} /></td>
                      <td><input type="text" value={row.licensePlate} onChange={e => updateRow(idx, 'licensePlate', e.target.value)} /></td>
                      <td><input type="date" value={row.woDate} onChange={e => updateRow(idx, 'woDate', e.target.value)} /></td>
                      <td><input type="text" value={row.woNumber} onChange={e => updateRow(idx, 'woNumber', e.target.value)} /></td>
                      <td>{row.isDuplicate && <span className="dupe-tag">Already exists</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="import-summary">{extracted.filter(r => r.selected && !r.isDuplicate).length} of {extracted.length} workorders will be imported</div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-secondary" onClick={() => setStep('paste')}>← Back</button>
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

  // Build WO number lookup for duplicate detection
  const existingWoNumbers = {};
  claims.forEach(c => { existingWoNumbers[c.woNumber] = c; });

  const createClaim = async (formData) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'claims'), {
      ...formData,
      baskets: [],
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
    const claimBaskets = Array.isArray(c.baskets) ? c.baskets : (c.basket ? [c.basket] : []);
    if (filterBasket === 'none' && claimBaskets.length > 0) return false;
    if (filterBasket !== 'all' && filterBasket !== 'none' && !claimBaskets.includes(filterBasket)) return false;
    if (filterDealer !== 'all' && c.dealerId !== filterDealer) return false;
    return true;
  });

  if (selectedClaim) {
    const claim = claims.find(c => c.id === selectedClaim);
    if (claim) return (
      <ClaimDetail
        claim={claim}
        dealers={dealers}
        onBack={() => setSelectedClaim(null)}
        onDelete={(c) => { setSelectedClaim(null); setDeletingClaim(c); }}
      />
    );
  }

  if (loading) return <div className="page-loading">Loading claims...</div>;

  // Group by VIN or license plate
  const groupMap = {};
  filtered.forEach(claim => {
    const key = (claim.vin || claim.licensePlate || '—').toUpperCase();
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(claim);
  });

  // Within each group: oldest WO first (top = oldest, bottom = newest)
  Object.values(groupMap).forEach(g => g.sort((a, b) => new Date(a.woDate) - new Date(b.woDate)));

  // Sort groups: newest WO date first (most recently active truck at top)
  const groups = Object.entries(groupMap)
    .map(([key, claims]) => ({ key, claims }))
    .sort((a, b) => {
      const latestA = Math.max(...a.claims.map(c => new Date(c.woDate)));
      const latestB = Math.max(...b.claims.map(c => new Date(c.woDate)));
      return latestB - latestA; // newest group first
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
            {group.claims.map(claim => {
              const claimBaskets = Array.isArray(claim.baskets) ? claim.baskets : (claim.basket ? [claim.basket] : []);
              return (
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
                    <BasketBadge baskets={claimBaskets} />
                    <button className="btn-delete-row" onClick={e => { e.stopPropagation(); setDeletingClaim(claim); }} title="Delete">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showQuickAdd && <QuickAddModal dealers={dealers} existingWoNumbers={existingWoNumbers} onSave={handleQuickAdd} onClose={() => setShowQuickAdd(false)} onOpenExisting={(id) => setSelectedClaim(id)} />}
      {showImport && <ImportModal dealers={dealers} existingWoNumbers={existingWoNumbers} onSave={handleImport} onClose={() => setShowImport(false)} />}
      {deletingClaim && <DeleteModal claim={deletingClaim} onConfirm={handleDeleteConfirm} onClose={() => setDeletingClaim(null)} />}
    </div>
  );
}

export default Claims;
