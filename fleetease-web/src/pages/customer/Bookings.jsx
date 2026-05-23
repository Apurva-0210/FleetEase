import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming'); // upcoming | past
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const r = await api.get('/bookings/my');
        const list = Array.isArray(r.data) ? r.data : [];
        setBookings(list);
      } catch (e) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location]);

  if (loading) {
    return <div className="container py-4">Loading bookings...</div>;
  }

  const upcoming = bookings.filter(
    (b) => (b.status || '').toLowerCase() !== 'cancelled'
  );
  const past = bookings.filter(
    (b) => (b.status || '').toLowerCase() === 'cancelled'
  );
  const view = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="container py-4">
      <h3 className="mb-3">My Bookings</h3>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setTab('upcoming')}
          >
            Upcoming ({upcoming.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'past' ? 'active' : ''}`}
            onClick={() => setTab('past')}
          >
            Past ({past.length})
          </button>
        </li>
      </ul>

      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Route</th>
              <th>Pickup → Drop</th>
              <th>Status</th>
              <th>Fare</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  No bookings in this list.
                </td>
              </tr>
            )}
            {view.map((b) => (
              <tr key={b.booking_id}>
                <td>#{b.booking_id}</td>
                <td>{b.route_id || '-'}</td>
                <td>
                  {(b.pickup_location || '—') +
                    ' → ' +
                    (b.drop_location || '—')}
                </td>
                <td className="text-capitalize">{b.status || 'pending'}</td>
                <td>₹{Number(b.fare || 0).toFixed(2)}</td>
                <td>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => navigate(`/booking/${b.booking_id}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Bookings;