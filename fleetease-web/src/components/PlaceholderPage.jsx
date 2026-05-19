import React from 'react';
import { useLocation } from 'react-router-dom';

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop().replace(/-/g, ' ');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page
        </h1>
        <p className="text-gray-600">
          This is a placeholder for the {pageName} page. It will be implemented soon.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
