import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './Layout.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/claims', label: 'Claims', icon: '📋' },
  { path: '/dealers', label: 'Dealers', icon: '🏢' },
  { path: '/labour-codes', label: 'Labour Codes', icon: '🔧' },
  { path: '/parts', label: 'Parts & Oils', icon: '🛢️' },
  { path: '/weekly-report', label: 'Weekly Report', icon: '📅' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function Layout({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>HNT Warranty</h2>
          <p className="sidebar-user">{user.displayName}</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;