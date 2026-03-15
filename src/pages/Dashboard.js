import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BASKETS } from './Claims';
import './Dashboard.css';

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const [claims, setClaims] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubClaims = onSnapshot(collection(db, 'claims'), (snapshot) => {
      setClaims(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubDealers = onSnapshot(collection(db, 'dealers'), (snapshot) => {
      setDealers(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.code.localeCompare(b.code)));
    });
    return () => { unsubClaims(); unsubDealers(); };
  }, []);

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  const getBaskets = (c) => Array.isArray(c.baskets) ? c.baskets : (c.basket ? [c.basket] : []);

  // Total open claims (not closed or warranty_done)
  const openClaims = claims.filter(c => {
    const b = getBaskets(c);
    return !b.includes('closed') && !b.includes('warranty_done') && !b.every(x => x === 'to_do');
  });

  // Need action: Pending Editing or Rejection
  const needAction = claims.filter(c => {
    const b = getBaskets(c);
    return b.includes('pending_editing') || b.includes('rejection');
  });

  // To Do (not yet worked on)
  const newClaims = claims.filter(c => {
    const b = getBaskets(c);
    return b.length === 0 || b.every(x => x === 'to_do');
  });

  // Weekly summary
  const { monday, sunday } = getWeekRange();
  const thisWeek = claims.filter(c => {
    const b = getBaskets(c);
    // Exclude claims that are only in To Do — not worked on
    if (b.every(x => x === 'to_do') || b.length === 0) return false;
    const updated = new Date(c.updatedAt || c.createdAt);
    return updated >= monday && updated <= sunday;
  });

  // Per basket counts
  const basketCounts = BASKETS.map(b => ({
    ...b,
    count: claims.filter(c => getBaskets(c).includes(b.id)).length,
  })).filter(b => b.count > 0).sort((a, b) => b.count - a.count);

  // Per dealer counts
  const dealerCounts = dealers.map(d => ({
    ...d,
    total: claims.filter(c => c.dealerId === d.id).length,
    open: claims.filter(c => c.dealerId === d.id && !getBaskets(c).includes('closed') && !getBaskets(c).includes('warranty_done')).length,
  })).filter(d => d.total > 0).sort((a, b) => b.open - a.open);

  const formatDateRange = () => {
    const opts = { day: 'numeric', month: 'short' };
    return `${monday.toLocaleDateString('en-GB', opts)} – ${sunday.toLocaleDateString('en-GB', opts)}`;
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Good morning, Warranty FTB 👋</p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="stat-cards">
        <StatCard
          label="Open Claims"
          value={openClaims.length}
          color="#1a1a2e"
          sub="not closed or done"
        />
        <StatCard
          label="Need Action"
          value={needAction.length}
          color={needAction.length > 0 ? '#dc2626' : '#10b981'}
          sub="rejection or pending editing"
        />
        <StatCard
          label="To Do"
          value={newClaims.length}
          color={newClaims.length > 0 ? '#f59e0b' : '#10b981'}
          sub="not yet worked on"
        />
        <StatCard
          label="This Week"
          value={thisWeek.length}
          color="#3b82f6"
          sub={formatDateRange()}
        />
      </div>

      <div className="dashboard-grid">
        {/* Need Action */}
        {needAction.length > 0 && (
          <div className="dashboard-card urgent">
            <div className="dashboard-card-title">🚨 Need Action</div>
            <div className="action-list">
              {needAction.map(claim => {
                const b = getBaskets(claim);
                const dealer = dealers.find(d => d.id === claim.dealerId);
                return (
                  <div key={claim.id} className="action-item">
                    <div className="action-item-left">
                      <span className="action-wo">WO {claim.woNumber}</span>
                      <span className="action-dealer">{dealer ? `${dealer.code} — ${dealer.name}` : '—'}</span>
                    </div>
                    <div className="action-badges">
                      {b.includes('rejection') && <span className="action-badge rejection">Rejection</span>}
                      {b.includes('pending_editing') && <span className="action-badge pending-editing">Pending Editing</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Claims per basket */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">📋 Claims per Basket</div>
          {basketCounts.length === 0 ? (
            <div className="dashboard-empty">No claims yet</div>
          ) : (
            <div className="basket-breakdown">
              {basketCounts.map(b => (
                <div key={b.id} className="basket-row">
                  <div className="basket-row-left">
                    <span className="basket-dot" style={{ background: b.color }} />
                    <span className="basket-name">{b.label}</span>
                  </div>
                  <div className="basket-row-right">
                    <div className="basket-bar-wrap">
                      <div
                        className="basket-bar"
                        style={{
                          width: `${Math.round((b.count / Math.max(...basketCounts.map(x => x.count))) * 100)}%`,
                          background: b.color + '40',
                          borderRight: `3px solid ${b.color}`,
                        }}
                      />
                    </div>
                    <span className="basket-count" style={{ color: b.color }}>{b.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claims per dealer */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">🏢 Claims per Dealer</div>
          {dealerCounts.length === 0 ? (
            <div className="dashboard-empty">No claims yet</div>
          ) : (
            <div className="dealer-breakdown">
              {dealerCounts.map(d => (
                <div key={d.id} className="dealer-row">
                  <span className="dealer-code-badge">{d.code}</span>
                  <span className="dealer-name">{d.name}</span>
                  <div className="dealer-counts">
                    <span className="dealer-open" title="Open claims">{d.open} open</span>
                    <span className="dealer-total" title="Total claims">/ {d.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* This week */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">📅 This Week — {formatDateRange()}</div>
          {thisWeek.length === 0 ? (
            <div className="dashboard-empty">No activity this week yet</div>
          ) : (
            <div className="week-list">
              {thisWeek.map(claim => {
                const dealer = dealers.find(d => d.id === claim.dealerId);
                const b = getBaskets(claim);
                return (
                  <div key={claim.id} className="week-item">
                    <div className="week-item-left">
                      <span className="week-wo">WO {claim.woNumber}</span>
                      <span className="week-dealer">{dealer ? `${dealer.code}` : '—'}</span>
                      {claim.about && <span className="week-about">{claim.about}</span>}
                    </div>
                    <div className="week-baskets">
                      {b.length === 0
                        ? <span className="basket-badge-sm basket-new-sm">New</span>
                        : b.slice(0, 2).map(id => {
                            const basket = BASKETS.find(bk => bk.id === id);
                            return basket
                              ? <span key={id} className="basket-badge-sm" style={{ background: basket.color + '18', color: basket.color, border: `1px solid ${basket.color}35` }}>{basket.label}</span>
                              : null;
                          })
                      }
                      {b.length > 2 && <span className="basket-badge-sm basket-more">+{b.length - 2}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
