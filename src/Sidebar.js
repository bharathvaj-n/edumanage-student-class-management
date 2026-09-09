import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut,
  X
} from 'lucide-react';

function Sidebar({ mobileOpen, setMobileOpen, onLogout }) {
  const closeMobileNav = () => setMobileOpen(false);

  return (
    <>
      <div 
        className={`sidebar-backdrop ${mobileOpen ? 'mobile-open' : ''}`} 
        onClick={closeMobileNav} 
      />
      
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">E</div>
          <div className="logo-text">
            <span className="brand-title">EduManage</span>
            <span className="brand-subtitle">Teacher Management</span>
          </div>
          {mobileOpen && (
            <button 
              onClick={closeMobileNav} 
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink 
            to="/" 
            end 
            onClick={closeMobileNav} 
            className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/class" 
            onClick={closeMobileNav} 
            className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Classes</span>
          </NavLink>

          <NavLink 
            to="/student" 
            onClick={closeMobileNav} 
            className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Students</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <NavLink 
            to="/settings" 
            onClick={closeMobileNav} 
            className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>

          <button onClick={onLogout} className="nav-link-item logout-button">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
