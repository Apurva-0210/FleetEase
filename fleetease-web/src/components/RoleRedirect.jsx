import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoleRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(atob(token.split('.')[1]));
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'agent':
          navigate('/agent/trips');
          break;
        case 'driver':
          navigate('/driver/dashboard');
          break;
        case 'manager':
          navigate('/manager/fleet');
          break;
        case 'company_admin':
          navigate('/company/charter');
          break;
        case 'customer':
          navigate('/my-bookings');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      navigate('/login');
    }
  }, [navigate]);

  return null;
}
