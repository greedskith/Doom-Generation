import React from 'react';
import { getOptimizedUrl } from '../utils/image.js';

export const PhotoGrid = ({
  photos,
  lcpThreshold,
  currentUser,
  openLightbox,
  handleLike
}) => {
  return (
    <main className="gallery-container">
      {photos.length === 0 && (
        <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem' }}>
          <h2>GALLERY EMPTY</h2>
          <p>The real-time database is currently empty.</p>
        </div>
      )}
      {photos.map((photo, index) => {
        const isLcpCandidate = index < lcpThreshold;
        const photoWidth = photo.width || 800;
        const photoHeight = photo.height || 800;
        return (
          <article
            key={photo.id}
            data-photo-id={photo.id}
            className="gallery-item"
          >
            <button
              type="button"
              className="image-container"
              style={{ aspectRatio: `${photoWidth} / ${photoHeight}` }}
              aria-haspopup="dialog"
              aria-label={`View photo ${photo.title} by ${photo.author}`}
              onClick={(e) => openLightbox(photo, e)}
            >
              <img
                src={getOptimizedUrl(photo.url, 800)}
                alt={photo.title}
                width={photoWidth}
                height={photoHeight}
                {...(isLcpCandidate
                  ? { fetchpriority: "high" }
                  : { loading: "lazy" })}
              />
              <div className="author-signature" aria-hidden="true">
                {photo.author}
              </div>
            </button>
            <div className="item-info">
              <div className="item-details">
                <h3>{photo.title}</h3>
              </div>
              <button
                type="button"
                className={`like-btn ${currentUser && photo.likedBy?.includes(currentUser.uid) ? 'liked' : ''}`}
                aria-pressed={currentUser && photo.likedBy?.includes(currentUser.uid)}
                aria-label={`Like ${photo.title}, currently ${photo.likes || 0} likes`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike(photo.id);
                }}
              >
                + LIKE [{photo.likes || 0}]
              </button>
            </div>
          </article>
        );
      })}
    </main>
  );
};
