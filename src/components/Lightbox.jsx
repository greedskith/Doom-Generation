import React from 'react';
import { CompositionDoodle } from './CompositionDoodle.jsx';
import { PhotoActions } from './PhotoActions.jsx';
import { getOptimizedUrl } from '../utils/image.js';

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
  analysisError,
  handleLike
}) => {
  return (
    <dialog
      ref={lightboxDialogRef}
      className="brutalist-dialog lightbox-dialog"
      aria-labelledby="lightbox-title"
      onClick={(e) => handleBackdropClick(e, closeLightbox)}
      onCancel={closeLightbox}
    >
      {selectedPhoto && (
        <div className="lightbox-content">
          <div className="lightbox-header">
            {isEditingTitle ? (
              <form onSubmit={handleSaveTitle} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  autoFocus
                  style={{ background: 'transparent', border: '2px solid var(--accent)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', fontFamily: 'inherit', fontSize: '1.25rem' }}
                />
                <button type="submit" className="btn btn-primary">[ SAVE ]</button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingTitle(false)}>[ CANCEL ]</button>
              </form>
            ) : (
              <h2 id="lightbox-title">{selectedPhoto.title}</h2>
            )}

            <PhotoActions
              currentUser={currentUser}
              selectedPhoto={selectedPhoto}
              isEditingTitle={isEditingTitle}
              setIsEditingTitle={setIsEditingTitle}
              setEditTitleValue={setEditTitleValue}
              handleDeletePhoto={handleDeletePhoto}
              handleAnalyse={handleAnalyse}
              isCurrentPhotoAnalyzing={isCurrentPhotoAnalyzing}
              currentAnalysis={currentAnalysis}
              isDoodleVisible={isDoodleVisible}
              closeLightbox={closeLightbox}
            />

          </div>
          <div className="lightbox-image-wrap">
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
                <div className="scanner-container">
                  <div className="scanner-line"></div>
                </div>
              )}
              {analysisError && (
                <div className="error-toast" style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: 'var(--bg)', color: 'var(--accent)',
                  border: '2px solid var(--accent)', padding: '10px',
                  zIndex: 100, display: 'flex', gap: '10px',
                  alignItems: 'center', fontWeight: 'bold'
                }}>
                  <div className="error-text">[ ERROR: {analysisError} ]</div>
                  <button className="brutal-btn" onClick={handleAnalyse}>[ RETRY ]</button>
                </div>
              )}
              <div className="lightbox-signature" aria-hidden="true">
                {selectedPhoto.author}
              </div>
            </div>
          </div>
          <div className="lightbox-footer">
            <div className="lightbox-meta">
              <span>ARTIST: <strong>{selectedPhoto.author}</strong></span>
            </div>
            <button
              type="button"
              className={`like-btn ${currentUser && selectedPhoto.likedBy?.includes(currentUser.uid) ? 'liked' : ''}`}
              aria-pressed={currentUser && selectedPhoto.likedBy?.includes(currentUser.uid)}
              aria-label={`Like ${selectedPhoto.title}, currently ${selectedPhoto.likes || 0} likes`}
              onClick={() => handleLike(selectedPhoto.id)}
            >
              + LIKE [{selectedPhoto.likes || 0}]
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};
