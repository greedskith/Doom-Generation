import React from 'react';

export const PostDialog = ({
  postDialogRef,
  handleBackdropClick,
  closePostDialog,
  handleUpload,
  file,
  setFile,
  title,
  setTitle,
  isUploading,
  showError
}) => {
  return (
    <dialog
      ref={postDialogRef}
      className="brutalist-dialog post-dialog"
      aria-labelledby="post-dialog-title"
      onClick={(e) => handleBackdropClick(e, closePostDialog)}
      onCancel={closePostDialog}
    >
      <div className="dialog-content">
        <h2 id="post-dialog-title">Post Picture</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="photo-upload" style={{ fontWeight: 'bold' }}>Select Photo</label>
            <span id="photo-upload-hint" style={{ fontSize: '0.85rem', opacity: 0.8 }}>JPEG, PNG, or WebP only. Max 5MB.</span>
            <input
              id="photo-upload"
              name="photo-upload"
              type="file"
              accept="image/jpeg, image/png, image/webp"
              aria-describedby="photo-upload-hint"
              className="input-field"
              style={{ padding: '0.5rem', border: '2px solid var(--border-color)' }}
              onChange={(e) => {
                const selectedFile = e.target.files[0];
                if (selectedFile) {
                  if (selectedFile.size > 5 * 1024 * 1024) {
                    showError("File size exceeds 5MB limit.");
                    e.target.value = "";
                    setFile(null);
                  } else {
                    setFile(selectedFile);
                  }
                } else {
                  setFile(null);
                }
              }}
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="photo-title" style={{ fontWeight: 'bold' }}>Title</label>
            <input
              id="photo-title"
              name="photo-title"
              type="text"
              placeholder="e.g. 'MIDNIGHT BLUE'"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closePostDialog}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || !title || isUploading}
            >
              {isUploading ? '[ UPLOADING... ]' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
