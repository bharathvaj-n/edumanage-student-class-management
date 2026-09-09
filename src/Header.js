import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from './AuthContext';

function Header({ onToggleMobileNav }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Dashboard', path: 'Home / Dashboard' };
      case '/class':
        return { title: 'Class Details', path: 'Home / Class Details' };
      case '/student':
        return { title: 'Student Details', path: 'Home / Student Details' };
      case '/settings':
        return { title: 'Settings', path: 'Home / Settings' };
      default:
        return { title: 'EduManage', path: 'Home' };
    }
  };

  const { title, path } = getPageInfo();

  const userName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Teacher';
  const avatarInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={onToggleMobileNav} 
          className="icon-btn hamburger-btn" 
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className="header-title-area">
          <h1 className="header-page-title">{title}</h1>
          <span className="header-breadcrumb">{path}</span>
        </div>
      </div>

      <div className="header-right-actions">
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </button>

        <div className="user-profile-badge" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <div className="avatar-circle">{avatarInitial}</div>
          <div className="user-info-text">
            <span className="user-name">{userName}</span>
            <span className="user-role">Teacher</span>
          </div>
          <ChevronDown size={14} style={{ color: '#64748B' }} />
        </div>
      </div>
    </header>
  );
}

export default Header;
