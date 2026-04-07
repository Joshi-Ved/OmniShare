import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, notificationsAPI } from '../services/api';
import { toast } from 'react-toastify';
import './NotificationsPage.css';

const strikeBell = (context, frequency, startTime, duration = 0.9) => {
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, startTime);
  master.gain.exponentialRampToValueAtTime(0.2, startTime + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  master.connect(context.destination);

  const fundamentals = [
    { ratio: 1, gain: 1.0, type: 'triangle' },
    { ratio: 2.01, gain: 0.35, type: 'sine' },
    { ratio: 2.98, gain: 0.2, type: 'sine' },
  ];

  fundamentals.forEach((partial) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, startTime);
    gainNode.gain.setValueAtTime(partial.gain * 0.18, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.95);

    oscillator.connect(gainNode);
    gainNode.connect(master);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
};

const playTone = (mode) => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const start = context.currentTime;

  if (mode === 'claim') {
    const melody = [523.25, 659.25, 783.99, 1046.5];
    melody.forEach((frequency, index) => {
      strikeBell(context, frequency, start + index * 0.14, 0.8);
    });
    setTimeout(() => context.close(), 1300);
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(493.88, start);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(0.06, start + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.26);
  oscillator.onended = () => context.close();
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [openedAnimationId, setOpenedAnimationId] = useState(null);
  const [claimedAnimationId, setClaimedAnimationId] = useState(null);
  const [confettiBursts, setConfettiBursts] = useState([]);

  const triggerConfetti = (notificationId) => {
    const burstId = `${notificationId}-${Date.now()}`;
    const pieces = Array.from({ length: 36 }, (_, index) => ({
      id: `${burstId}-${index}`,
      x: `${Math.random() * 100}%`,
      hue: Math.floor(20 + Math.random() * 340),
      delay: Math.random() * 0.24,
      duration: 1.3 + Math.random() * 1.1,
      drift: `${(Math.random() - 0.5) * 220}px`,
      size: 6 + Math.floor(Math.random() * 8),
      rotate: Math.floor(Math.random() * 400),
    }));

    setConfettiBursts((prev) => [...prev, { id: burstId, pieces }]);
    window.setTimeout(() => {
      setConfettiBursts((prev) => prev.filter((burst) => burst.id !== burstId));
    }, 2600);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileResponse, notificationsResponse] = await Promise.all([
        authAPI.getProfile(),
        notificationsAPI.getAll(),
      ]);

      setProfile(profileResponse.data || null);
      const notificationData = notificationsResponse.data?.results || notificationsResponse.data || [];
      setNotifications(Array.isArray(notificationData) ? notificationData : []);
    } catch (error) {
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNotification = async (notificationId) => {
    try {
      setMarkingId(notificationId);
      await notificationsAPI.open(notificationId);
      setOpenedAnimationId(notificationId);
      playTone('open');
      setTimeout(() => setOpenedAnimationId(null), 900);
      await loadData();
    } catch (error) {
      toast.error('Could not update notification');
    } finally {
      setMarkingId(null);
    }
  };

  const claimCoins = async (notificationId) => {
    try {
      setMarkingId(notificationId);
      const response = await notificationsAPI.claimCoins(notificationId);
      setClaimedAnimationId(notificationId);
      playTone('claim');
      triggerConfetti(notificationId);
      toast.success(response.data?.message || 'Coins claimed successfully');
      setTimeout(() => setClaimedAnimationId(null), 1200);
      await loadData();
    } catch (error) {
      const message = error.response?.data?.error || 'Could not claim coins';
      toast.error(message);
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return <div className="notifications-page loading">Loading notifications...</div>;
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="notifications-page">
      <div className="confetti-stage" aria-hidden="true">
        {confettiBursts.map((burst) => (
          <div key={burst.id} className="confetti-burst">
            {burst.pieces.map((piece) => (
              <span
                key={piece.id}
                className="confetti-piece"
                style={{
                  left: piece.x,
                  '--confetti-hue': piece.hue,
                  '--confetti-delay': `${piece.delay}s`,
                  '--confetti-duration': `${piece.duration}s`,
                  '--confetti-drift': piece.drift,
                  '--confetti-size': `${piece.size}px`,
                  '--confetti-rotate': `${piece.rotate}deg`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="container notifications-shell">
        <section className="notifications-hero card">
          <div>
            <span className="notifications-kicker">Retention</span>
            <h1>Loyalty Notifications</h1>
            <p>Track coin rewards, promotions, and admin messages in one place.</p>
          </div>
          <div className="notifications-summary">
            <div className="summary-card">
              <strong>{profile?.loyalty_coins || 0}</strong>
              <span>Coins</span>
            </div>
            <div className="summary-card">
              <strong>{unreadCount}</strong>
              <span>Unread</span>
            </div>
          </div>
        </section>

        <div className="notifications-actions">
          <Link to="/profile" className="btn btn-secondary">Back to Profile</Link>
          <Link to="/" className="btn btn-primary">Explore Rentals</Link>
        </div>

        {notifications.length > 0 ? (
          <div className="notifications-list-grid">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`notification-card card ${notification.is_read ? '' : 'unread'} ${openedAnimationId === notification.id ? 'opened-animate' : ''} ${claimedAnimationId === notification.id ? 'claimed-animate' : ''}`}
              >
                <div className="notification-card-head">
                  <div>
                    <span className="notification-type">{notification.notification_type}</span>
                    <h3>{notification.title}</h3>
                  </div>
                  <div className="notification-meta">
                    {notification.coin_amount !== 0 && (
                      <span className="coin-chip">+{notification.coin_amount} coins</span>
                    )}
                    <span>{new Date(notification.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <p>{notification.message}</p>

                <div className="notification-card-actions">
                  {!notification.is_read ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openNotification(notification.id)}
                      disabled={markingId === notification.id}
                    >
                      {markingId === notification.id ? 'Opening...' : 'Open Loyalty Mail'}
                    </button>
                  ) : notification.coin_amount > 0 && !notification.is_claimed ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => claimCoins(notification.id)}
                      disabled={markingId === notification.id}
                    >
                      {markingId === notification.id ? 'Claiming...' : `Claim ${notification.coin_amount} Coins`}
                    </button>
                  ) : notification.is_claimed ? (
                    <span className="read-pill">Coins Claimed</span>
                  ) : (
                    <span className="read-pill">Opened</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card empty-state-card">
            <h2>No notifications yet</h2>
            <p>Your loyalty messages and coin rewards from admin will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
