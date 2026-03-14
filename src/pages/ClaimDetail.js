import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { BASKETS, FLAGS, DIFFICULTIES, BasketBadge } from './Claims';
import './ClaimDetail.css';

function ClaimDetail({ claim, dealers, onBack, onDelete }) {
  const [form, setForm] = useState({
    woNumber: claim.woNumber || '',
    woDate: claim.woDate || '',
    dealerId: claim.dealerId || '',
    vin: claim.vin || '',
    licensePlate: claim.licensePlate || '',
    about: claim.about || '',
    basket: claim.basket || null,
    flags: claim.flags || [],
    difficulty: claim.difficulty || 1,
    commentary: claim.commentary || '',
    questions: claim.questions || '',
    claimCards: claim.claimCards?.length > 0
      ? claim.claimCards
      : [{ claimCardNumber: '', isRSA: false, claimNumbers: [''] }],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dealer = dealers.find(d => d.id === form.dealerId);

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const basketChanged = claim.basket !== form.basket;
    const basketHistory = basketChanged
      ? [...(claim.basketHistory || []), {
          basket: claim.basket,
          startDate: claim.basketChangedAt || claim.createdAt,
          endDate: now
        }]
      : claim.basketHistory || [];

    await updateDoc(doc(db, 'claims', claim.id), {
      ...form,
      basketHistory,
      basketChangedAt: basketChanged ? now : (claim.basketChangedAt || now),
      updatedAt: now,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFlag = (flagId) => {
    const flags = form.flags.includes(flagId)
      ? form.flags.filter(f => f !== flagId)
      : [...form.flags, flagId];
    setForm({ ...form, flags });
  };

  const addClaimCard = () => {
    if (form.claimCards.length >= 2) return;
    setForm({ ...form, claimCards: [...form.claimCards, { claimCardNumber: '', isRSA: false, claimNumbers: [''] }] });
  };

  const removeClaimCard = (idx) => {
    setForm({ ...form, claimCards: form.claimCards.filter((_, i) => i !== idx) });
  };

  const updateClaimCard = (idx, field, value) => {
    setForm({ ...form, claimCards: form.claimCards.map((cc, i) => i === idx ? { ...cc, [field]: value } : cc) });
  };

  const addClaimNumber = (cardIdx) => {
    setForm({
      ...form,
      claimCards: form.claimCards.map((cc, i) =>
        i === cardIdx ? { ...cc, claimNumbers: [...cc.claimNumbers, ''] } : cc
      )
    });
  };

  const removeClaimNumber = (cardIdx, numIdx) => {
    setForm({
      ...form,
      claimCards: form.claimCards.map((cc, i) =>
        i === cardIdx ? { ...cc, claimNumbers: cc.claimNumbers.filter((_, ni) => ni !== numIdx) } : cc
      )
    });
  };

  const updateClaimNumber = (cardIdx, numIdx, value) => {
    setForm({
      ...form,
      claimCards: form.claimCards.map((cc, i) =>
        i === cardIdx
          ? { ...cc, claimNumbers: cc.claimNumbers.map((n, ni) => ni === numIdx ? value : n) }
          : cc
      )
    });
  };

  const currentBasket = BASKETS.find(b => b.id === form.basket);
  const currentDifficulty = DIFFICULTIES.find(d => d.value === form.difficulty);

  return (
    <div className="claim-detail-page">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to Claims</button>
        <div className="detail-header-center">
          <h1>WO {form.woNumber}</h1>
          <div className="detail-header-meta">
            {dealer && <span>{dealer.code} — {dealer.name}</span>}
            {form.woDate && <span>{new Date(form.woDate).toLocaleDateString('en-GB')}</span>}
            {form.licensePlate && <span>🚛 {form.licensePlate}</span>}
            {form.vin && <span>VIN: {form.vin}</span>}
          </div>
        </div>
        <div className="detail-header-actions">
          <button className="btn-delete" onClick={() => onDelete(claim)}>Delete</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="detail-body">
        {/* Left column */}
        <div className="detail-left">

          {/* Basic info */}
          <div className="detail-card">
            <div className="detail-card-title">Workorder Info</div>
            <div className="form-row-2">
              <div className="form-group">
                <label>WO Number</label>
                <input type="text" value={form.woNumber} onChange={e => setForm({ ...form, woNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label>WO Date</label>
                <input type="date" value={form.woDate} onChange={e => setForm({ ...form, woDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Dealer</label>
              <select value={form.dealerId} onChange={e => setForm({ ...form, dealerId: e.target.value })}>
                <option value="">Select dealer...</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>License Plate</label>
                <input type="text" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>VIN</label>
                <input type="text" value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>What is it about?</label>
              <input type="text" value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} placeholder="e.g. AdBlue issue, Webasto, Night heating..." />
            </div>
          </div>

          {/* Claim cards */}
          <div className="detail-card">
            <div className="detail-card-title">Claim Cards & Numbers</div>
            {form.claimCards.map((cc, cardIdx) => (
              <div key={cardIdx} className="cc-block">
                <div className="cc-block-header">
                  <span>Claim Card {cardIdx + 1}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`toggle-btn ${cc.isRSA ? 'active' : ''}`}
                      onClick={() => updateClaimCard(cardIdx, 'isRSA', !cc.isRSA)}
                    >
                      {cc.isRSA ? '🚨 RSA' : 'RSA?'}
                    </button>
                    {form.claimCards.length > 1 && (
                      <button type="button" className="btn-remove-text" onClick={() => removeClaimCard(cardIdx)}>Remove card</button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Claim Card Number</label>
                  <input
                    type="text"
                    value={cc.claimCardNumber}
                    onChange={e => updateClaimCard(cardIdx, 'claimCardNumber', e.target.value)}
                    placeholder="Card number"
                  />
                </div>
                <label className="sub-label">Claim Numbers</label>
                {cc.claimNumbers.map((num, numIdx) => (
                  <div key={numIdx} className="claim-number-row">
                    <input
                      type="text"
                      value={num}
                      onChange={e => updateClaimNumber(cardIdx, numIdx, e.target.value)}
                      placeholder={`Claim number ${numIdx + 1}`}
                    />
                    {cc.claimNumbers.length > 1 && (
                      <button type="button" className="btn-icon-remove" onClick={() => removeClaimNumber(cardIdx, numIdx)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-link" onClick={() => addClaimNumber(cardIdx)}>+ Add claim number</button>
              </div>
            ))}
            {form.claimCards.length < 2 && (
              <button type="button" className="btn-add-card" onClick={addClaimCard}>+ Add second claim card</button>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="detail-right">

          {/* Status */}
          <div className="detail-card">
            <div className="detail-card-title">Status</div>

            <div className="form-group">
              <label>Basket</label>
              <div className="basket-picker">
                {BASKETS.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    className={`basket-option ${form.basket === b.id ? 'active' : ''}`}
                    style={{ '--basket-color': b.color }}
                    onClick={() => setForm({ ...form, basket: b.id })}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
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

          {/* Notes */}
          <div className="detail-card">
            <div className="detail-card-title">Notes</div>
            <div className="form-group">
              <label>Commentary</label>
              <textarea
                value={form.commentary}
                onChange={e => setForm({ ...form, commentary: e.target.value })}
                placeholder="Your notes and thoughts on this claim..."
                rows={4}
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

          {/* Basket history */}
          {claim.basketHistory?.length > 0 && (
            <div className="detail-card">
              <div className="detail-card-title">Basket History</div>
              <div className="basket-history">
                {claim.basketHistory.map((h, i) => {
                  const basket = BASKETS.find(b => b.id === h.basket);
                  const days = Math.round((new Date(h.endDate) - new Date(h.startDate)) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={i} className="history-row">
                      <span className="history-basket" style={{ color: basket?.color || '#888' }}>
                        {basket?.label || h.basket}
                      </span>
                      <span className="history-days">
                        {days === 0 ? 'Less than a day' : `${days} day${days !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  );
                })}
                {form.basket && (
                  <div className="history-row history-current">
                    <span className="history-basket" style={{ color: currentBasket?.color || '#888' }}>
                      {currentBasket?.label || form.basket} <span className="current-tag">current</span>
                    </span>
                    <span className="history-days">
                      {(() => {
                        const days = Math.round((new Date() - new Date(claim.basketChangedAt || claim.createdAt)) / (1000 * 60 * 60 * 24));
                        return days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''}`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClaimDetail;
