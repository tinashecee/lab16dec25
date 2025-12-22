import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const handleLogin = async (credentials) => {
    try {
      await authService.login(credentials);
      // After successful login, redirect to the return URL
      navigate(returnUrl);
    } catch (error) {
      // Handle login error
    }
  };

  // ... rest of the component
} 