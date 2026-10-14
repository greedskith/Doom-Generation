import React from 'react';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export const PostDialog = ({
  postDialogRef,
  handleBackdropClick,
  closePostDialog,
  handleUpload,
  file,
  previewUrl,
  uploadFormKey,
  onFileSelected,
  title,
  setTitle,
  isUploading,
  showError
}) => {
  const hasPreview = Boolean(previewUrl && file);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!selectedFile) {
      onFileSelected(null);
      return;
    }

    if (!acceptedTypes.includes(selectedFile.type)) {
      showError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      onFileSelected(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      showError('File size exceeds the 5MB limit.');
      event.target.value = '';
      onFileSelected(null);
      return;
    }

    onFileSelected(selectedFile);
  };

  return (
    <dialog
      ref={postDialogRef}
      className="archive-dialog form-dialog post-dialog"
      aria-labelledby="post-dialog-title"
      onClick={(event) => handleBackdropClick(event, closePostDialog)}
      onCancel={closePostDialog}
    >
      <div className="dialog-content">
        <header className="dialog-heading">
          <div>
            <p className="archive-kicker">Contribution</p>
            <h2 id="post-dialog-title">Add work</h2>
            <p>Share one image with the archive.</p>
          </div>
          <button type="button" className="icon-button" onClick={closePostDialog} aria-label="Close add work dialog">
            <CloseIcon />
          </button>
        </header>

        <form
          key={uploadFormKey}
          className="upload-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleUpload();
          }}
        >
          <div className="form-field">
            <input
              id="photo-upload"
              name="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="photo-upload-hint"
              className="file-input"
              onChange={handleFileChange}
              required
            />
            <label htmlFor="photo-upload" className={`file-picker ${hasPreview ? 'has-preview' : ''}`}>
              {hasPreview ? (
                <>
                  <img src={previewUrl} alt={`Preview of ${file.name}`} className="upload-preview" />
                  <span className="file-picker-copy">
                    <strong>{file.name}</strong>
                    <span>Choose a different image</span>
                  </span>
                </>
              ) : (
                <span className="file-picker-copy">
                  <strong>Choose an image</strong>
                  <span>JPEG, PNG, or WebP · 5MB maximum</span>
                </span>
              )}
            </label>
            <p id="photo-upload-hint" className="field-hint">The original proportions will be retained in the archive.</p>
          </div>

          <div className="form-field">
            <label htmlFor="photo-title">Title</label>
            <input
              id="photo-title"
              name="photo-title"
              type="text"
              placeholder="Name the work"
              className="input-field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="text-action" onClick={closePostDialog}>Cancel</button>
            <button type="submit" className="utility-button utility-button-primary" disabled={!file || !title || isUploading}>
              {isUploading ? 'Adding…' : 'Add to archive'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
