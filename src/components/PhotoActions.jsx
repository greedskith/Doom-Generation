import React from 'react';

export const PhotoActions = ({
  currentUser,
  selectedPhoto,
  isEditingTitle,
  setIsEditingTitle,
  setEditTitleValue,
  handleDeletePhoto,
  handleToggleNotes,
  isCurrentPhotoAnalyzing,
  isNotesOpen
}) => {
  const ownsPhoto = currentUser && selectedPhoto.userId === currentUser.uid;
  const notesLabel = isCurrentPhotoAnalyzing
    ? 'Reading frame…'
    : isNotesOpen
      ? 'Hide notes'
      : 'Composition notes';

  return (
    <div className="photo-actions" aria-label="Photo actions">
      {ownsPhoto && !isEditingTitle && (
        <div className="owner-actions">
          <button
            type="button"
            className="text-action"
            onClick={() => {
              setEditTitleValue(selectedPhoto.title);
              setIsEditingTitle(true);
            }}
          >
            Edit
          </button>
          <button type="button" className="text-action text-action-danger" onClick={handleDeletePhoto}>
            Delete
          </button>
        </div>
      )}
      <button
        type="button"
        className={`text-action ${isNotesOpen ? 'text-action-active' : 'text-action-primary'}`}
        onClick={handleToggleNotes}
        disabled={isCurrentPhotoAnalyzing}
      >
        {notesLabel}
      </button>
    </div>
  );
};
