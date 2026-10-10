import React, { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { analyzeComposition } from './services/gemini.js';
import { CompositionDoodle } from './components/CompositionDoodle.jsx';

// Mock Data for Phase 1 Prototype
const initialPhotos = [
  {
      id: '1',
      url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=800&auto=format&fit=crop',
      title: 'Serenity',
      author: 'Jane Doe',
      likes: 12
  },
  {
      id: '2',
      url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=800&auto=format&fit=crop',
      title: 'Alpine Echo',
      author: 'Alex Smith',
      likes: 34
  },
  {
      id: '3',
      url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
      title: 'Wanderlust',
      author: 'Sam Taylor',
      likes: 8
  },
  {
      id: '4',
      url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=800&auto=format&fit=crop',
      title: 'Golden Hour',
      author: 'Emily Chen',
      likes: 56
  },
  {
      id: '5',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop',
      title: 'Deep Woods',
      author: 'Michael B.',
      likes: 21
  },
  {
      id: '6',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop',
      title: 'Monolith',
      author: 'James Harrison',
      likes: 45
  },
  {
      id: '7',
      url: 'https://images.unsplash.com/photo-1506744626753-1fa44df14cb0?q=80&w=1920&auto=format&fit=crop',
      title: 'The Portal',
      author: 'Emily Chen',
      likes: 89
  },
  {
      id: '8',
      url: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=1920&auto=format&fit=crop',
      title: 'Equilibrium',
      author: 'David Smith',
      likes: 112
  },
  {
      id: '9',
      url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1920&auto=format&fit=crop',
      title: 'Convergence',
      author: 'Lisa Wang',
      likes: 67
  },
  {
      id: '10',
      url: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=1920&auto=format&fit=crop',
      title: 'Spiral Ascend',
      author: 'Marcus Chen',
      likes: 234
  }
];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  
  // Gemini Analysis State
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDoodle, setShowDoodle] = useState(false);
  const [error, setError] = useState(null);

  const postDialogRef = useRef(null);
  const lightboxDialogRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const handleLogin = () => {
    setCurrentUser({ displayName: 'Guest Artist' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const openPostDialog = (e) => {
    lastFocusedElementRef.current = e?.currentTarget || null;
    postDialogRef.current?.showModal();
  };

  const closePostDialog = () => {
    postDialogRef.current?.close();
    setFile(null);
    setTitle('');
    lastFocusedElementRef.current?.focus();
  };

  const openLightbox = (photo, e) => {
    const cardEl = e?.currentTarget;
    lastFocusedElementRef.current = cardEl || null;
    const cardImg = cardEl?.querySelector('.image-container img');

    if (!document.startViewTransition) {
      setSelectedPhoto(photo);
      lightboxDialogRef.current?.showModal();
      return;
    }

    if (cardImg) {
      cardImg.style.viewTransitionName = 'active-photo-morph';
    }

    const transition = document.startViewTransition(() => {
      if (cardImg) {
        cardImg.style.viewTransitionName = 'none';
      }
      flushSync(() => {
        setSelectedPhoto(photo);
      });
      lightboxDialogRef.current?.showModal();
    });

    transition.finished.finally(() => {
      if (cardImg) {
        cardImg.style.viewTransitionName = 'none';
      }
    });
  };

  const closeLightbox = () => {
    if (!selectedPhoto) return;
    const photoId = selectedPhoto.id;
    const cardImg = document.querySelector(`[data-photo-id="${photoId}"] .image-container img`);

    if (!document.startViewTransition) {
      lightboxDialogRef.current?.close();
      setSelectedPhoto(null);
      lastFocusedElementRef.current?.focus();
      return;
    }

    const transition = document.startViewTransition(() => {
      if (cardImg) {
        cardImg.style.viewTransitionName = 'active-photo-morph';
      }
      flushSync(() => {
        lightboxDialogRef.current?.close();
        setSelectedPhoto(null);
        setAnalysis(null);
        setShowDoodle(false);
      });
      lastFocusedElementRef.current?.focus();
    });

    transition.finished.finally(() => {
      if (cardImg) {
        cardImg.style.viewTransitionName = 'none';
      }
    });
  };

  const handleBackdropClick = (e, closeFn) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeFn();
    }
  };

  const handleAnalyse = async () => {
    if (!selectedPhoto) return;
    if (showDoodle && analysis) {
      setShowDoodle(false);
      return;
    }
    if (!showDoodle && analysis) {
      setShowDoodle(true);
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeComposition(selectedPhoto.url);
      setAnalysis(result);
      setShowDoodle(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = () => {
    if (!file || !title || !currentUser) return;
    const imageUrl = URL.createObjectURL(file);
    const newPhoto = {
      id: Date.now().toString(),
      url: imageUrl,
      title,
      author: currentUser.displayName,
      likes: 0
    };
    setPhotos([newPhoto, ...photos]);
    closePostDialog();
  };

  const handleLike = (photoId) => {
    if (!currentUser) {
      alert("PLEASE SIGN IN TO LIKE.");
      return;
    }
    setPhotos(prevPhotos =>
      prevPhotos.map(p => {
        if (p.id === photoId) {
          const updated = { ...p, likes: p.likes + 1 };
          if (selectedPhoto && selectedPhoto.id === photoId) {
            setSelectedPhoto(updated);
          }
          return updated;
        }
        return p;
      })
    );
  };

  return (
    <>
      <header className="navbar">
        <h1 className="logo">Doom Generation</h1>
        <div className="auth-container">
          {currentUser ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className="user-badge">{currentUser.displayName}</span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openPostDialog}
                aria-haspopup="dialog"
              >
                Post
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLogin}
            >
              Sign In [ DEMO ]
            </button>
          )}
        </div>
      </header>

      <main className="gallery-container">
        {photos.map((photo, index) => {
          const isLcpCandidate = index < 2;
          return (
            <article
              key={photo.id}
              data-photo-id={photo.id}
              className="gallery-item"
              tabIndex={0}
              role="button"
              aria-haspopup="dialog"
              aria-label={`View photo ${photo.title} by ${photo.author}`}
              onClick={(e) => openLightbox(photo, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(photo, e);
                }
              }}
            >
              <div className="image-container">
                <img
                  src={photo.url}
                  alt={photo.title}
                  width="800"
                  height="800"
                  {...(isLcpCandidate
                    ? { fetchPriority: "high" }
                    : { loading: "lazy" })}
                />
                <div className="author-signature" aria-hidden="true">
                  {photo.author}
                </div>
              </div>
              <div className="item-info">
                <div className="item-details">
                  <h3>{photo.title}</h3>
                </div>
                <button
                  type="button"
                  className={`like-btn ${photo.likes > 0 ? 'liked' : ''}`}
                  aria-pressed={photo.likes > 0}
                  aria-label={`Like ${photo.title}, currently ${photo.likes} likes`}
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

      {/* Native <dialog> for Post Modal */}
      <dialog
        ref={postDialogRef}
        className="brutalist-dialog post-dialog"
        aria-labelledby="post-dialog-title"
        onClick={(e) => handleBackdropClick(e, closePostDialog)}
        onCancel={closePostDialog}
      >
        <div className="dialog-content">
          <h2 id="post-dialog-title">Post Picture</h2>
          <input
            type="file"
            accept="image/*"
            className="input-field"
            style={{ padding: '0.5rem', border: '2px solid var(--border-color)' }}
            onChange={(e) => setFile(e.target.files[0])}
            aria-label="Upload photo file"
          />
          <input
            type="text"
            placeholder="TITLE (e.g. 'MIDNIGHT BLUE')"
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Photo title"
          />
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closePostDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || !title}
            >
              Post
            </button>
          </div>
        </div>
      </dialog>

      {/* Native <dialog> for Photo Lightbox */}
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
              <h2 id="lightbox-title">{selectedPhoto.title}</h2>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAnalyse}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? '[ ANALYSING... ]' : (showDoodle ? '[ HIDE DOODLE ]' : '[ ANALYSE COMPOSITION ]')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary lightbox-close-btn"
                  onClick={closeLightbox}
                  aria-label="Close photo preview"
                >
                  [ ESC / CLOSE ]
                </button>
              </div>
            </div>
            <div className="lightbox-image-wrap">
              <div className="lightbox-image-inner">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title}
                  className="lightbox-image"
                  style={{ viewTransitionName: 'active-photo-morph' }}
                />
                <CompositionDoodle analysis={analysis} visible={showDoodle} />
                {isAnalyzing && (
                  <div className="scanner-container">
                    <div className="scanner-line"></div>
                  </div>
                )}
                {error && (
                  <div className="error-toast" style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'var(--bg)', color: 'var(--accent)',
                    border: '2px solid var(--accent)', padding: '10px',
                    zIndex: 100, display: 'flex', gap: '10px',
                    alignItems: 'center', fontWeight: 'bold'
                  }}>
                    <div className="error-text">[ ERROR: {error} ]</div>
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
                className={`like-btn ${selectedPhoto.likes > 0 ? 'liked' : ''}`}
                aria-pressed={selectedPhoto.likes > 0}
                aria-label={`Like ${selectedPhoto.title}, currently ${selectedPhoto.likes} likes`}
                onClick={() => handleLike(selectedPhoto.id)}
              >
                + LIKE [{selectedPhoto.likes || 0}]
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

export default App;
