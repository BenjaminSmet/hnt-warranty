import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './Claims.css';

const BASKETS = [
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

const FLAGS = [
  { id: 'rsa', label: 'RSA', icon: '🚨' },
  { id: 'waiting_dealer', label: 'Waiting on Dealer', icon: '⏳' },
  { id: 'check_boss', label: 'Check with Boss', icon: '👆' },
  { id: 'ready_approval', label: 'Ready for Approval', icon: '✅' },
  { id: 'difficult', label: 'Difficult', icon: '⚠️' },
];

const DIFFICULTIES = [
  { value: 1, label: 'Low', color: '#10b981' },
  { value: 2, label: 'Medium', color: '#f59e0b' },
  { value: 3, label: 'High', color: '#ef4444' },
];

const emptyForm = {
  woNumber: '',
  woDate: '',
  dealerId: '',
  vin: '',
  licensePlate: '',
  about: '',
  basket: 'ready_for_approval',
  flags: [],
  difficulty: 1,
  commentary: '',
  questions: '',
  claimCards: [{ claimCardNumber: '', isRSA: false, claimNumbers: [''] }],
};

function ClaimForm({ form, setForm, dealers, onSubmit, onCancel, isEditing }) {
  const addClaimCard = () => {
    setForm({ ...form, claimCards: [...form.claimCards, { claimCardNumber: '', isRSA: false, claimNumbers: [''] }] });
  };

  const removeClaimCard = (idx) => {
    const updated = form.claimCards.filter((_, i) => i !== idx);
    setForm({ ...form, claimCards: updated });
  };

  const updateClaimCard = (idx, field, value) => {
    const updated = form.claimCards.map((cc, i) => i === idx ? { ...cc, [field]: value } : cc);
    setForm({ ...form, claimCards: updated });
  };

  const addClaimNumber = (cardIdx) => {
    const updated = form.claimCards.map((cc, i) =>
      i === cardIdx ? { ...cc, claimNumbers: [...cc.claimNumbers, ''] } : cc
    );
    setForm({ ...form, claimCards: updated });
  };

  const removeClaimNumber = (cardIdx, numIdx) => {
    const updated = form.claimCards.map((cc, i) =>
      i === cardIdx ? { ...cc, claimNumbers: cc.claimNumbers.filter((_, ni) => ni !== numIdx) } : cc
    );
    setForm({ ...form, claimCards: updated });
  };

  const updateClaimNumber = (cardIdx, numIdx, value) => {
    const updated = form.claimCards.map((cc, i) =>
      i === cardIdx ? { ...cc, claimNumbers: cc.claimNumbers.map((n, ni) => ni === numIdx ? value : n) } : cc
    );
    setForm({ ...form, claimCards: updated });
  };

  const toggleFlag = (flagId) => {
    const flags = form.flags.includes(flagId)
      ? form.flags.filter(f => f !== flagId)
      : [...form.flags, flagId];
    setForm({ ...form, flags });
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-large">
        <h2>{isEditing ? 'Edit Workorder' : 'Add Workorder'}</h2>

        <div className="form-grid">
          {/* Left column */}
          <div className="form-col">
            <div className="form-section-title">Workorder Info</div>

            <div className="form-row">
              <div className="form-group">
                <label>WO Number *</label>
                <input type="text" value={form.woNumber} onChange={e => setForm({ ...form, woNumber: e.target.value })} placeholder="e.g. 12345" />
              </div>
              <div className="form-group">
                <label>WO Date *</label>
                <input type="date" value={form.woDate} onChange={e => setForm({ ...form, woDate: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Dealer *</label>
              <select value={form.dealerId} onChange={e => setForm({ ...form, dealerId: e.target.value })}>
                <option value="">Select dealer...</option>
                {dealers.map(d => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>VIN</label>
                <input type="text" value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} placeholder="Truck VIN" />
              </div>
              <div className="form-group">
                <label>License Plate</label>
                <input type="text" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} placeholder="e.g. 1-ABC-234" />
              </div>
            </div>

            <div className="form-group">
              <label>What is it about?</label>
              <input type="text" value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} placeholder="e.g. AdBlue issue, Webasto, Night heating..." />
            </div>

            <div className="form-section-title" style={{ marginTop: 20 }}>Status</div>

            <div className="form-group">
              <label>Basket *</label>
              <select value={form.basket} onChange={e => setForm({ ...form, basket: e.target.value })}>
                {BASKETS.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <div className="difficulty-picker">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    className={`difficulty-btn ${form.difficulty === d.value ? 'active' : ''}`}
                    style={{ '--diff-color': d.color }}
                    onClick={() => setForm({ ...form, difficulty: d.value })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Flags</label>
              <div className="flags-picker">
                {FLAGS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    className={`flag-btn ${form.flags.includes(f.id) ? 'active' : ''}`}
                    onClick={() => toggleFlag(f.id)}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="form-col">
            <div className="form-section-title">Claim Cards & Numbers</div>

            {form.claimCards.map((cc, cardIdx) => (
              <div key={cardIdx} className="claim-card-block">
                <div className="claim-card-block-header">
                  <span>Claim Card {cardIdx + 1}</span>
                  {form.claimCards.length > 1 && (
                    <button type="button" className="btn-remove" onClick={() => removeClaimCard(cardIdx)}>Remove</button>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Claim Card Number</label>
                    <input
                      type="text"
                      value={cc.claimCardNumber}
                      onChange={e => updateClaimCard(cardIdx, 'claimCardNumber', e.target.value)}
                      placeholder="Card number"
                    />
                  </div>
                  <div className="form-group rsa-toggle">
                    <label>RSA</label>
                    <button
                      type="button"
                      className={`toggle-btn ${cc.isRSA ? 'active' : ''}`}
                      onClick={() => updateClaimCard(cardIdx, 'isRSA', !cc.isRSA)}
                    >
                      {cc.isRSA ? '✅ RSA' : 'Not RSA'}
                    </button>
                  </div>
                </div>

                <label className="claim-numbers-label">Claim Numbers</label>
                {cc.claimNumbers.map((num, numIdx) => (
                  <div key={numIdx} className="claim-number-row">
                    <input
                      type="text"
                      value={num}
                      onChange={e => updateClaimNumber(cardIdx, numIdx, e.target.value)}
                      placeholder={`Claim number ${numIdx + 1}`}
                    />
                    {cc.claimNumbers.length > 1 && (
                      <button type="button" className="btn-remove-small" onClick={() => removeClaimNumber(cardIdx, numIdx)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-add-small" onClick={() => addClaimNumber(cardIdx)}>+ Add claim number</button>
              </div>
            ))}

            {form.claimCards.length < 2 && (
              <button type="button" className="btn-add-card" onClick={addClaimCard}>+ Add second claim card (RSA)</button>
            )}

            <div className="form-section-title" style={{ marginTop: 20 }}>Notes</div>

            <div className="form-group">
              <label>Commentary</label>
              <textarea
                value={form.commentary}
                onChange={e => setForm({ ...form, commentary: e.target.value })}
                placeholder="Your notes and thoughts on this claim..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Questions</label>
              <textarea
                value={form.questions}
                onChange={e => setForm({ ...form, questions: e.target.value })}
                placeholder="Questions for your boss or colleagues..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit}>{isEditing ? 'Save Changes' : 'Add Workorder'}</button>
        </div>
      </div>
    </div>
  );
}

function BasketBadge({ basketId }) {
  const basket = BASKETS.find(b => b.id === basketId);
  if (!basket) return null;
  return (
    <span className="basket-badge" style={{ background: basket.color + '20', color: basket.color, border: `1px solid ${basket.color}40` }}>
      {basket.label}
    </span>
  );
}

function DifficultyBadge({ value }) {
  const d = DIFFICULTIES.find(d => d.value === value);
  if (!d) return null;
  return <span className="difficulty-badge" style={{ color: d.color }}>{'●'.repeat(value)}{'○'.repeat(3 - value)} {d.label}</span>;
}

function Claims() {
  const [claims, setClaims] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [deletingClaim, setDeletingClaim] = useState(null);
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [filterBasket, setFilterBasket] = useState('all');
  const [filterDealer, setFilterDealer] = useState('all');

  useEffect(() => {
    const unsubClaims = onSnapshot(collection(db, 'claims'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by WO date then VIN
      data.sort((a, b) => {
        if (a.woDate !== b.woDate) return new Date(a.woDate) - new Date(b.woDate);
        return (a.vin || '').localeCompare(b.vin || '');
      });
      setClaims(data);
      setLoading(false);
    });

    const unsubDealers = onSnapshot(collection(db, 'dealers'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.code.localeCompare(b.code));
      setDealers(data);
    });

    return () => { unsubClaims(); unsubDealers(); };
  }, []);

  const handleSubmit = async () => {
    if (!form.woNumber.trim() || !form.woDate || !form.dealerId) return;

    const now = new Date().toISOString();
    if (editingClaim) {
      const basketChanged = editingClaim.basket !== form.basket;
      const basketHistory = basketChanged
        ? [...(editingClaim.basketHistory || []), { basket: editingClaim.basket, startDate: editingClaim.basketChangedAt || editingClaim.createdAt, endDate: now }]
        : editingClaim.basketHistory || [];
      await updateDoc(doc(db, 'claims', editingClaim.id), {
        ...form,
        basketHistory,
        basketChangedAt: basketChanged ? now : editingClaim.basketChangedAt,
        updatedAt: now,
      });
    } else {
      await addDoc(collection(db, 'claims'), {
        ...form,
        basketHistory: [],
        basketChangedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    resetForm();
  };

  const handleEdit = (claim) => {
    setEditingClaim(claim);
    setForm({
      woNumber: claim.woNumber,
      woDate: claim.woDate,
      dealerId: claim.dealerId,
      vin: claim.vin || '',
      licensePlate: claim.licensePlate || '',
      about: claim.about || '',
      basket: claim.basket,
      flags: claim.flags || [],
      difficulty: claim.difficulty || 1,
      commentary: claim.commentary || '',
      questions: claim.questions || '',
      claimCards: claim.claimCards || [{ claimCardNumber: '', isRSA: false, claimNumbers: [''] }],
    });
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteDoc(doc(db, 'claims', deletingClaim.id));
    setDeletingClaim(null);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingClaim(null);
    setShowForm(false);
  };

  const getDealerName = (id) => {
    const d = dealers.find(d => d.id === id);
    return d ? `${d.code} — ${d.name}` : 'Unknown';
  };

  const filtered = claims.filter(c => {
    if (filterBasket !== 'all' && c.basket !== filterBasket) return false;
    if (filterDealer !== 'all' && c.dealerId !== filterDealer) return false;
    return true;
  });

  if (loading) return <div className="page-loading">Loading claims...</div>;

  return (
    <div className="claims-page">
      <div className="page-header">
        <div>
          <h1>Claims</h1>
          <p className="page-subtitle">{filtered.length} workorders{filterBasket !== 'all' || filterDealer !== 'all' ? ' (filtered)' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Workorder</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select value={filterBasket} onChange={e => setFilterBasket(e.target.value)}>
          <option value="all">All Baskets</option>
          {BASKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select value={filterDealer} onChange={e => setFilterDealer(e.target.value)}>
          <option value="all">All Dealers</option>
          {dealers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
        </select>
      </div>

      {/* Claims list */}
      <div className="claims-list">
        {filtered.length === 0 && (
          <div className="empty-state">No workorders found. Add your first one!</div>
        )}
        {filtered.map(claim => (
          <div key={claim.id} className={`claim-row ${expandedClaim === claim.id ? 'expanded' : ''}`}>
            <div className="claim-row-main" onClick={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}>
              <div className="claim-row-left">
                <span className="wo-number">WO {claim.woNumber}</span>
                <span className="wo-date">{new Date(claim.woDate).toLocaleDateString('en-GB')}</span>
                <span className="wo-dealer">{getDealerName(claim.dealerId)}</span>
                {claim.about && <span className="wo-about">{claim.about}</span>}
              </div>
              <div className="claim-row-right">
                {claim.flags?.map(flagId => {
                  const flag = FLAGS.find(f => f.id === flagId);
                  return flag ? <span key={flagId} className="flag-tag" title={flag.label}>{flag.icon}</span> : null;
                })}
                <DifficultyBadge value={claim.difficulty} />
                <BasketBadge basketId={claim.basket} />
                <span className="expand-icon">{expandedClaim === claim.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedClaim === claim.id && (
              <div className="claim-row-detail">
                <div className="detail-grid">
                  <div className="detail-col">
                    {claim.vin && <div className="detail-item"><span className="detail-label">VIN</span><span>{claim.vin}</span></div>}
                    {claim.licensePlate && <div className="detail-item"><span className="detail-label">License Plate</span><span>{claim.licensePlate}</span></div>}

                    <div className="detail-item">
                      <span className="detail-label">Claim Cards</span>
                      <div className="claim-cards-detail">
                        {claim.claimCards?.map((cc, i) => (
                          <div key={i} className="cc-block">
                            <div className="cc-header">
                              {cc.isRSA && <span className="rsa-tag">🚨 RSA</span>}
                              <span className="cc-number">{cc.claimCardNumber || 'No card number yet'}</span>
                            </div>
                            <div className="claim-numbers-list">
                              {cc.claimNumbers?.filter(n => n).map((n, ni) => (
                                <span key={ni} className="claim-number-tag">#{n}</span>
                              ))}
                              {!cc.claimNumbers?.some(n => n) && <span className="no-claims">No claim numbers yet</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="detail-col">
                    {claim.commentary && (
                      <div className="detail-item">
                        <span className="detail-label">💬 Commentary</span>
                        <p className="detail-text">{claim.commentary}</p>
                      </div>
                    )}
                    {claim.questions && (
                      <div className="detail-item">
                        <span className="detail-label">❓ Questions</span>
                        <p className="detail-text">{claim.questions}</p>
                      </div>
                    )}
                    {claim.basketHistory?.length > 0 && (
                      <div className="detail-item">
                        <span className="detail-label">📋 Basket History</span>
                        <div className="basket-history">
                          {claim.basketHistory.map((h, i) => {
                            const basket = BASKETS.find(b => b.id === h.basket);
                            const days = Math.round((new Date(h.endDate) - new Date(h.startDate)) / (1000 * 60 * 60 * 24));
                            return (
                              <div key={i} className="history-item">
                                <span style={{ color: basket?.color }}>{basket?.label}</span>
                                <span className="history-days">{days === 0 ? 'Less than a day' : `${days} day${days !== 1 ? 's' : ''}`}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-actions">
                  <button className="btn-edit" onClick={() => handleEdit(claim)}>Edit</button>
                  <button className="btn-delete" onClick={() => setDeletingClaim(claim)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <ClaimForm
          form={form}
          setForm={setForm}
          dealers={dealers}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          isEditing={!!editingClaim}
        />
      )}

      {deletingClaim && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <h2>Delete Workorder</h2>
            <p className="modal-warning">
              Are you sure you want to delete <strong>WO {deletingClaim.woNumber}</strong>? This action cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDeletingClaim(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Claims;
