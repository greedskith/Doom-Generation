import React from 'react';
import { getOptimizedUrl, getOptimizedSrcSet } from '../utils/image.js';

function HeartIcon() {
  return (
    <svg className="like-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

export const PhotoGrid = ({
  photos,
  lcpThreshold,
  currentUser,
  openLightbox,
  handleLike
}) => {
  const workLabel = `${photos.length} ${photos.length === 1 ? 'work' : 'works'}`;

  return (
    <main className="archive-main">
      <section className="archive-intro" aria-labelledby="archive-title">
        <p className="archive-kicker">Exhibition Index</p>
        <h1 id="archive-title">Doom Generation</h1>
        <div className="archive-intro-bottom">
          <p>Photographs gathered in public, held without the noise.</p>
          <span className="archive-count" aria-label={`${workLabel} in the archive`}>{workLabel}</span>
        </div>
      </section>

      {photos.length === 0 ? (
        <section className="gallery-empty" aria-live="polite">
          <p className="archive-kicker">Empty Archive</p>
          <h2>The collection is currently unpopulated.</h2>
          <p>When a photograph is catalogued, it will appear here.</p>
        </section>
      ) : (
        <section className="gallery-columns" aria-label="Archive works">
          {photos.map((photo, index) => {
            const isLcpCandidate = index < lcpThreshold;
            const photoWidth = photo.width || 800;
            const photoHeight = photo.height || 800;
            const isLiked = Boolean(currentUser && photo.likedBy?.includes(currentUser.uid));
            const likes = photo.likes || 0;

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
                  aria-label={`View ${photo.title} by ${photo.author}`}
                  onClick={(event) => openLightbox(photo, event)}
                >
                  <img
                    src={getOptimizedUrl(photo.url, 800)}
                    srcSet={getOptimizedSrcSet(photo.url, [400, 800, 1200])}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    alt={photo.title}
                    width={photoWidth}
                    height={photoHeight}
                    {...(isLcpCandidate
                      ? { fetchPriority: 'high' }
                      : { loading: 'lazy' })}
                  />
                </button>

                <div className="gallery-caption">
                  <div className="gallery-caption-copy">
                    <h2>{photo.title}</h2>
                    <p>{photo.author}</p>
                  </div>
                  <button
                    type="button"
                    className={`like-btn ${isLiked ? 'is-liked' : ''}`}
                    aria-pressed={isLiked}
                    aria-label={`${isLiked ? 'Remove appreciation for' : 'Appreciate'} ${photo.title}; ${likes} ${likes === 1 ? 'appreciation' : 'appreciations'}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleLike(photo.id);
                    }}
                  >
                    <HeartIcon />
                    <span aria-hidden="true">{likes}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};
