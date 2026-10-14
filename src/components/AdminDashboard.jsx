import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';

const ADMIN_EMAIL = 'sagarranjan993@gmail.com';
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

function formatDate(value, formatter, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : formatter.format(parsed);
}

function currentIsoTimestamp() {
  return new Date().toISOString();
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export const AdminDashboard = ({ currentUser, dashboardDialogRef, handleBackdropClick, closeDashboard }) => {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [whitelistedEmails, setWhitelistedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const inputRef = useRef(null);
  const messageTimerRef = useRef(null);

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return undefined;
    const usersQuery = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      setRegisteredUsers(snapshot.docs.map((entry) => {
        const user = entry.data();
        return {
          id: entry.id,
          ...user,
          lastSeenLabel: formatDate(user.lastLogin, dateTimeFormatter, 'Unknown')
        };
      }));
    }, (error) => {
      console.error('Failed to load users:', error);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      setWhitelistedEmails(snapshot.docs.map((entry) => {
        const admin = entry.data();
        return {
          email: entry.id,
          ...admin,
          addedLabel: formatDate(admin.addedAt, dateFormatter, '')
        };
      }));
    }, (error) => {
      console.error('Failed to load admins:', error);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => () => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
  }, []);

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const showMessage = (message, isError = false) => {
    clearMessages();
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    if (isError) {
      setActionError(message);
    } else {
      setActionSuccess(message);
    }
    messageTimerRef.current = setTimeout(clearMessages, 4000);
  };

  const handleWhitelist = async (email) => {
    if (!email || !email.includes('@')) {
      showMessage('Enter a valid email address.', true);
      return;
    }
    setIsAdding(true);
    try {
      await setDoc(doc(db, 'admins', email.toLowerCase().trim()), {
        addedAt: currentIsoTimestamp(),
        addedBy: currentUser.email
      });
      showMessage(`${email} can now contribute.`);
      setNewEmail('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Whitelist error:', error);
      showMessage(`Could not add contributor: ${error.message}`, true);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveWhitelist = async (email) => {
    if (email === ADMIN_EMAIL) {
      showMessage('The primary administrator cannot be removed.', true);
      return;
    }
    try {
      await deleteDoc(doc(db, 'admins', email));
      showMessage(`${email} no longer has contributor access.`);
    } catch (error) {
      console.error('Remove error:', error);
      showMessage(`Could not remove contributor: ${error.message}`, true);
    }
  };

  const handleQuickWhitelist = async (email) => {
    if (whitelistedEmails.some((entry) => entry.email === email)) {
      showMessage(`${email} already has contributor access.`, true);
      return;
    }
    await handleWhitelist(email);
  };

  if (!isAdmin) return null;

  return (
    <dialog
      ref={dashboardDialogRef}
      className="archive-dialog form-dialog admin-dashboard-dialog"
      aria-labelledby="admin-dashboard-title"
      onClick={(event) => handleBackdropClick(event, closeDashboard)}
      onCancel={closeDashboard}
    >
      <div className="dialog-content admin-dashboard">
        <header className="dialog-heading">
          <div>
            <p className="archive-kicker">Operations</p>
            <h2 id="admin-dashboard-title">Archive administration</h2>
          </div>
          <button type="button" className="icon-button" onClick={closeDashboard} aria-label="Close archive administration">
            <CloseIcon />
          </button>
        </header>

        <div className="admin-tabs" role="tablist" aria-label="Archive administration sections">
          <button
            id="registered-users-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            aria-controls="registered-users-panel"
            className={`admin-tab ${activeTab === 'users' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Registered users <span>{registeredUsers.length}</span>
          </button>
          <button
            id="contributors-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'whitelist'}
            aria-controls="contributors-panel"
            className={`admin-tab ${activeTab === 'whitelist' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('whitelist')}
          >
            Contributors <span>{whitelistedEmails.length}</span>
          </button>
        </div>

        {actionError && <p className="admin-message admin-message-error" role="alert">{actionError}</p>}
        {actionSuccess && <p className="admin-message admin-message-success" role="status">{actionSuccess}</p>}

        {activeTab === 'users' && (
          <section id="registered-users-panel" className="admin-panel" role="tabpanel" aria-labelledby="registered-users-tab">
            <p className="admin-intro">People who have signed in to Doom Generation.</p>
            <div className="admin-list">
              {registeredUsers.length === 0 ? (
                <p className="admin-empty">No registered users yet.</p>
              ) : (
                registeredUsers.map((user) => {
                  const isWhitelisted = whitelistedEmails.some((entry) => entry.email === user.email);
                  return (
                    <article key={user.id} className="admin-row">
                      <div className="admin-row-copy">
                        <div className="admin-name-line">
                          <strong>{user.displayName || 'Anonymous'}</strong>
                          {isWhitelisted && <span className="admin-badge">Contributor</span>}
                        </div>
                        <p>{user.email}</p>
                        <time dateTime={user.lastLogin || undefined}>Last seen {user.lastSeenLabel}</time>
                      </div>
                      {!isWhitelisted && user.email !== ADMIN_EMAIL && (
                        <button type="button" className="text-action text-action-primary" onClick={() => handleQuickWhitelist(user.email)}>
                          Allow uploads
                        </button>
                      )}
                      {isWhitelisted && user.email !== ADMIN_EMAIL && (
                        <button type="button" className="text-action text-action-danger" onClick={() => handleRemoveWhitelist(user.email)}>
                          Remove access
                        </button>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}

        {activeTab === 'whitelist' && (
          <section id="contributors-panel" className="admin-panel" role="tabpanel" aria-labelledby="contributors-tab">
            <p className="admin-intro">Contributors may add photographs to the archive.</p>
            <form
              className="admin-add-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleWhitelist(newEmail);
              }}
            >
              <label className="sr-only" htmlFor="contributor-email">Contributor email</label>
              <input
                ref={inputRef}
                id="contributor-email"
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="input-field"
                autoComplete="email"
                required
              />
              <button type="submit" className="utility-button utility-button-primary" disabled={isAdding || !newEmail}>
                {isAdding ? 'Adding…' : 'Add contributor'}
              </button>
            </form>

            <div className="admin-list">
              {whitelistedEmails.length === 0 ? (
                <p className="admin-empty">No contributors have been added.</p>
              ) : (
                whitelistedEmails.map((admin) => (
                  <article key={admin.email} className="admin-row">
                    <div className="admin-row-copy">
                      <div className="admin-name-line">
                        <strong>{admin.email}</strong>
                        {admin.email === ADMIN_EMAIL && <span className="admin-badge admin-badge-owner">Owner</span>}
                      </div>
                      {admin.addedLabel && <time dateTime={admin.addedAt}>Added {admin.addedLabel}</time>}
                    </div>
                    {admin.email !== ADMIN_EMAIL && (
                      <button type="button" className="text-action text-action-danger" onClick={() => handleRemoveWhitelist(admin.email)}>
                        Remove access
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </dialog>
  );
};
