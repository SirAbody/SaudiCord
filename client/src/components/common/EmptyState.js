// Empty State Component
import React from 'react';

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-6xl text-text-tertiary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
