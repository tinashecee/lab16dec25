import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="/images/logo.png" 
        alt="Laboratory Logo" 
        className="h-20 w-auto"
      />
    </div>
  );
}