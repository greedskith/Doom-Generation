import React, { useState } from 'react';
import { CompositionDoodle } from './CompositionDoodle.jsx';
import { PhotoActions } from './PhotoActions.jsx';
import { getOptimizedUrl } from '../utils/image.js';

function HeartIcon() {
  return (
    <svg className="like-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export const Lightbox = ({
  lightboxDialogRef,
  handleBackdropClick,
  closeLightbox,
  selectedPhoto,
  currentUser,
  isEditingTitle,
  setIsEditingTitle,
  editTitleValue,
  setEditTitleValue,
  handleSaveTitle,
  handleDeletePhoto,
  handleAnalyse,
  isCurrentPhotoAnalyzing,
  currentAnalysis,
  isDoodleVisible,
  handleToggleDoodle,
  analysisError,
  handleLike
}) => {
  const [prevPhotoId, setPrevPhotoId] = useState(selectedPhoto?.id);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  if (selectedPhoto?.id !== prevPhotoId) {
    setPrevPhotoId(selectedPhoto?.id);
    setIsNotesOpen(false);
  }

  const isLiked = Boolean(currentUser && selectedPhoto?.likedBy?.includes(currentUser.uid));
  const likes = selectedPhoto?.likes || 0;

  const handleToggleNotes = () => {
    if (!currentAnalysis && !isCurrentPhotoAnalyzing) {
      handleAnalyse();
      setIsNotesOpen(true);
      return;
    }
    setIsNotesOpen((prev) => !prev);
  };

  return (
    <dialog
      ref={lightboxDialogRef}
      className="archive-dialog lightbox-dialog"
      aria-label={selectedPhoto ? `Viewing ${selectedPhoto.title}` : 'Viewing photo'}
      onClick={(event) => handleBackdropClick(event, closeLightbox)}
      onCancel={closeLightbox}
    >
      {selectedPhoto && (
        <div className="lightbox-content">
          <header className="lightbox-header">
            <div className="lightbox-title-group">
              <p className="archive-kicker">Catalogue Entry</p>
              {isEditingTitle ? (
                <form className="title-edit-form" onSubmit={handleSaveTitle}>
                  <label className="sr-only" htmlFor="lightbox-title-input">Photo title</label>
                  <input
                    id="lightbox-title-input"
                    type="text"
                    value={editTitleValue}
                    onChange={(event) => setEditTitleValue(event.target.value)}
                    className="title-edit-input"
                    autoFocus
                    required
                  />
                  <button type="submit" className="text-action text-action-primary">Save</button>
                  <button type="button" className="text-action" onClick={() => setIsEditingTitle(false)}>Cancel</button>
                </form>
              ) : (
                <>
                  <h2 id="lightbox-title">{selectedPhoto.title}</h2>
                  <p className="lightbox-byline">{selectedPhoto.author}</p>
                </>
              )}
            </div>
            <button
              type="button"
              className="icon-button dialog-close"
              onClick={closeLightbox}
              aria-label="Close photo viewer"
            >
              <CloseIcon />
            </button>
          </header>

          <div className="lightbox-stage">
            <div className="lightbox-image-inner">
              <img
                src={getOptimizedUrl(selectedPhoto.url, 1600)}
                alt={selectedPhoto.title}
                className="lightbox-image"
                {...(selectedPhoto.width ? { width: selectedPhoto.width } : {})}
                {...(selectedPhoto.height ? { height: selectedPhoto.height } : {})}
              />
              <CompositionDoodle analysis={currentAnalysis} visible={isDoodleVisible} />
              {isCurrentPhotoAnalyzing && (
                <div className="reading-frame-indicator" aria-live="polite">
                  Reading frame…
                </div>
              )}
              {analysisError && (
                <div className="analysis-error" role="alert">
                  <p>{analysisError}</p>
                  <button type="button" className="text-action text-action-primary" onClick={handleAnalyse}>Try again</button>
                </div>
              )}
            </div>

            {isNotesOpen && currentAnalysis && (
              <div className="composition-panel" role="region" aria-label="Composition notes">
                <div className="composition-panel-header">
                  <div className="composition-panel-title">
                    <span className="archive-kicker">Composition notes</span>
                    <h3 className="composition-rule">{currentAnalysis.rule}</h3>
                  </div>
                  <button
                    type="button"
                    className="icon-button dialog-close"
                    onClick={() => setIsNotesOpen(false)}
                    aria-label="Close composition notes"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <p className="composition-observation">
                  {currentAnalysis.observation || 'A quiet frame anchored by light, geometry, and negative space.'}
                </p>
                <div className="composition-panel-footer">
                  <label className="composition-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(isDoodleVisible)}
                      onChange={handleToggleDoodle}
                    />
                    <span>Overlay structural hairlines</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <footer className="lightbox-footer">
            <div className="lightbox-meta">
              <span>Artist</span>
              <strong>{selectedPhoto.author}</strong>
            </div>
            <div className="lightbox-tools">
              <button
                type="button"
                className={`like-btn ${isLiked ? 'is-liked' : ''}`}
                aria-pressed={isLiked}
                aria-label={`${isLiked ? 'Remove appreciation for' : 'Appreciate'} ${selectedPhoto.title}; ${likes} ${likes === 1 ? 'appreciation' : 'appreciations'}`}
                onClick={() => handleLike(selectedPhoto.id)}
              >
                <HeartIcon />
                <span aria-hidden="true">{likes}</span>
              </button>
              <PhotoActions
                currentUser={currentUser}
                selectedPhoto={selectedPhoto}
                isEditingTitle={isEditingTitle}
                setIsEditingTitle={setIsEditingTitle}
                setEditTitleValue={setEditTitleValue}
                handleDeletePhoto={handleDeletePhoto}
                handleToggleNotes={handleToggleNotes}
                isCurrentPhotoAnalyzing={isCurrentPhotoAnalyzing}
                isNotesOpen={isNotesOpen}
              />
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
};
