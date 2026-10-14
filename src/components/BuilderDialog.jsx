import React from 'react';

export const BuilderDialog = ({
  builderDialogRef,
  handleBackdropClick,
  closeBuilderDialog
}) => {
  return (
    <dialog
      ref={builderDialogRef}
      className="brutalist-dialog post-dialog"
      aria-labelledby="builder-dialog-title"
      onClick={(e) => handleBackdropClick(e, closeBuilderDialog)}
      onCancel={closeBuilderDialog}
    >
      <div className="dialog-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 id="builder-dialog-title" style={{ margin: 0, textBox: 'trim-both cap alphabetic' }}>ABOUT THE BUILDER</h2>
          <button type="button" className="btn btn-secondary" onClick={closeBuilderDialog} aria-label="Close builder dialog" style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>[ X ]</button>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <img
            src="/builder.jpg"
            alt="Sagar Ranjan"
            style={{
              width: '160px',
              height: '160px',
              objectFit: 'cover',
              objectPosition: 'top',
              border: 'none',
              flexShrink: 0,
              filter: 'grayscale(20%)',
            }}
          />
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <strong style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}>SAGAR RANJAN</strong>
              <p style={{ fontSize: '1rem', lineHeight: '1.7', margin: 0, color: 'var(--text-primary)', opacity: 0.85 }}>
                He built this.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <a href="https://github.com/greedskith" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', padding: '0.75rem', minWidth: '120px' }}>[ GITHUB ]</a>
              <a href="https://twitter.com/greedskith" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', padding: '0.75rem', minWidth: '120px' }}>[ TWITTER ]</a>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
};
