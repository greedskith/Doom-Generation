import React from 'react';

export const PhotoActions = ({
  currentUser,
  selectedPhoto,
  isEditingTitle,
  setIsEditingTitle,
  setEditTitleValue,
  handleDeletePhoto,
  handleAnalyse,
  isCurrentPhotoAnalyzing,
  currentAnalysis,
  isDoodleVisible,
  closeLightbox
}) => {
  return (
    <div className="modal-actions">
      {currentUser && selectedPhoto.userId === currentUser.uid && !isEditingTitle && (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => { setIsEditingTitle(true); setEditTitleValue(selectedPhoto.title); }}>[ EDIT ]</button>
          <button type="button" className="btn btn-secondary" onClick={handleDeletePhoto} style={{ color: '#ff4d4d', borderColor: '#ff4d4d' }}>[ DELETE ]</button>
        </>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleAnalyse}
        disabled={isCurrentPhotoAnalyzing}
      >
        {isCurrentPhotoAnalyzing
          ? '[ ANALYSING... ]'
          : currentAnalysis
            ? (isDoodleVisible ? '[ HIDE DOODLE ]' : '[ SHOW DOODLE ]')
            : '[ ANALYSE COMPOSITION ]'}
      </button>
      <button
        type="button"
        className="btn btn-secondary lightbox-close-btn"
        onClick={closeLightbox}
        aria-label="Close photo preview"
      >
        [ CLOSE ]
      </button>
    </div>
  );
};
