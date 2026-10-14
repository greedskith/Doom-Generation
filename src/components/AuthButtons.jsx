import React from 'react';

export const AuthButtons = ({
  currentUser,
  isUploader,
  openBuilderDialog,
  openPostDialog,
  handleLogin,
  handleLogout
}) => {
  return (
    <div className="auth-container">
      <button type="button" className="btn btn-secondary" onClick={openBuilderDialog}>
        [ BUILDER ]
      </button>
      {currentUser ? (
        <>
          <span className="user-badge">{currentUser.displayName}</span>
          {isUploader && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openPostDialog}
              aria-haspopup="dialog"
            >
              POST
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
          >
            [ LOGOUT ]
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleLogin}
        >
          SIGN IN
        </button>
      )}
    </div>
  );
};
