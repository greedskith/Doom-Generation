import React from 'react';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export const BuilderDialog = ({
  builderDialogRef,
  handleBackdropClick,
  closeBuilderDialog
}) => {
  return (
    <dialog
      ref={builderDialogRef}
      className="archive-dialog form-dialog builder-dialog"
      aria-labelledby="builder-dialog-title"
      onClick={(event) => handleBackdropClick(event, closeBuilderDialog)}
      onCancel={closeBuilderDialog}
    >
      <div className="dialog-content">
        <header className="dialog-heading">
          <div>
            <p className="archive-kicker">About</p>
            <h2 id="builder-dialog-title">The maker</h2>
          </div>
          <button type="button" className="icon-button" onClick={closeBuilderDialog} aria-label="Close about dialog">
            <CloseIcon />
          </button>
        </header>

        <section className="builder-monograph" aria-label="About Sagar Ranjan">
          <figure className="builder-portrait">
            <img src="/builder.jpg" alt="Sagar Ranjan holding sparklers at night" />
          </figure>
          <div className="builder-copy">
            <h3>Sagar Ranjan</h3>
            <p>Doom Generation is an independent place for images to be seen with care.</p>
            <p>Built and maintained by Sagar Ranjan.</p>
            <div className="builder-links">
              <a href="https://github.com/greedskith" target="_blank" rel="noopener noreferrer" className="utility-button">
                GitHub <span className="sr-only">(opens in a new tab)</span>
              </a>
              <a href="https://twitter.com/greedskith" target="_blank" rel="noopener noreferrer" className="utility-button">
                Twitter / X <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </dialog>
  );
};
