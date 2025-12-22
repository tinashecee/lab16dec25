import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const destination = searchParams.get('destination') || '/';

  useEffect(() => {
    if (user) {
      // User is already authenticated, redirect to destination
      navigate(destination);
    } else {
      // User needs to log in first, redirect to login with return URL
      navigate(`/login?returnUrl=${encodeURIComponent(destination)}`);
    }
  }, [user, navigate, destination]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
} 