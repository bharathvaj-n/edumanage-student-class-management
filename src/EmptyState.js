import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionButton }) => {
  return (
    <div className="empty-state-card">
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={28} />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
