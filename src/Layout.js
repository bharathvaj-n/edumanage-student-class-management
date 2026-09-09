import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ children, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        onLogout={onLogout} 
      />

      <div className="main-wrapper">
        <Header onToggleMobileNav={() => setMobileOpen(!mobileOpen)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
