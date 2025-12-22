import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6">
      <div className="text-center text-sm text-gray-600">
        <p>
          Lab Partners | Powered by{' '}
          <a 
            href="https://soxfort.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700"
          >
            Soxfort Solutions
          </a>
          {' '}© {currentYear}
        </p>
      </div>
    </footer>
  );
} 