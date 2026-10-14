import React from 'react';

function Icon({ children }) {
  return (
    <svg className="utility-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const InfoIcon = () => <Icon><circle cx="12" cy="12" r="8" /><path d="M12 10.7v5M12 8.2h.01" /></Icon>;
const AddIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>;
const ConsoleIcon = () => <Icon><rect x="5" y="5" width="14" height="14" rx="1" /><path d="m8.5 10 2 2-2 2M13.5 14h2" /></Icon>;
const SignInIcon = () => <Icon><path d="M14 5h4v14h-4M5 12h10M11 8l4 4-4 4" /></Icon>;
const SignOutIcon = () => <Icon><path d="M10 5H6v14h4M19 12H9M15 8l4 4-4 4" /></Icon>;

export const AuthButtons = ({
  currentUser,
  isUploader,
  isAdminUser,
  openBuilderDialog,
  openPostDialog,
  openDashboard,
  handleLogin,
  handleLogout
}) => {
  return (
    <nav className="auth-container" aria-label="Archive controls">
      <button
        type="button"
        className="utility-button"
        onClick={openBuilderDialog}
        aria-haspopup="dialog"
        aria-label="About Doom Generation"
      >
        <InfoIcon />
        <span className="utility-label">About</span>
      </button>

      {currentUser ? (
        <>
          <span className="user-badge" title={currentUser.displayName || currentUser.email || 'Signed in'}>
            {currentUser.displayName || currentUser.email || 'Signed in'}
          </span>
          {isUploader && (
            <button
              type="button"
              className="utility-button utility-button-primary"
              onClick={openPostDialog}
              aria-haspopup="dialog"
              aria-label="Add a photograph to the archive"
            >
              <AddIcon />
              <span className="utility-label">Add work</span>
            </button>
          )}
          {isAdminUser && (
            <button
              type="button"
              className="utility-button"
              onClick={openDashboard}
              aria-haspopup="dialog"
              aria-label="Open archive administration"
            >
              <ConsoleIcon />
              <span className="utility-label">Admin</span>
            </button>
          )}
          <button
            type="button"
            className="utility-button"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <SignOutIcon />
            <span className="utility-label">Sign out</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className="utility-button utility-button-primary"
          onClick={handleLogin}
          aria-label="Sign in"
        >
          <SignInIcon />
          <span className="utility-label">Sign in</span>
        </button>
      )}
    </nav>
  );
};
