import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { analyzeComposition } from './services/gemini.js';
import { CompositionDoodle } from './components/CompositionDoodle.jsx';

import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, doc, updateDoc, increment, serverTimestamp, query, orderBy, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, provider, db } from './firebase.js';

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

const getOptimizedUrl = (url, width) => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${parts[1]}`;
    }
  }
  return url;
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Gemini Analysis State
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDoodle, setShowDoodle] = useState(false);
  const [error, setError] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');

  const announce = (message, assertive = false) => {
    if (assertive) setAssertiveAnnouncement(message);
    else setAnnouncement(message);
    setTimeout(() => {
      if (assertive) setAssertiveAnnouncement('');
      else setAnnouncement('');
    }, 6000);
  };

  const showError = (message) => {
    setError(message);
    announce("Error: " + message, true);
    setTimeout(() => setError(null), 5000);
  };

  const postDialogRef = useRef(null);
  const lightboxDialogRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('timestamp', 'desc'));
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const fetchedPhotos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPhotos(fetchedPhotos);
    }, (err) => {
      console.error("Firestore error:", err);
    });
    return () => unsubscribeDb();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      showError("Login failed: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const seedDatabase = async () => {
    try {
      const batch = writeBatch(db);
      initialPhotos.forEach((photo, index) => {
        const newRef = doc(collection(db, 'photos'));
        batch.set(newRef, {
          url: photo.url,
          title: photo.title,
          author: photo.author,
          likes: photo.likes,
          likedBy: [],
          timestamp: new Date(Date.now() - index * 1000) // stable descending order
        });
      });
      await batch.commit();
    } catch (err) {
      showError("Failed to seed database: " + err.message);
    }
  };

  const openPostDialog = (e) => {
    lastFocusedElementRef.current = e?.currentTarget || null;
    postDialogRef.current?.showModal();
  };

  const closePostDialog = () => {
    postDialogRef.current?.close();
    setFile(null);
    setTitle('');
    setIsUploading(false);
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
    announce("Analyzing composition...");
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeComposition(selectedPhoto.url);
      setAnalysis(result);
      setShowDoodle(true);
      announce("Analysis complete. Visual doodle overlaid.");
    } catch (err) {
      showError(err.message);
      announce(`Error analyzing composition: ${err.message}`, true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !currentUser) return;
    announce("Uploading image...");
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'antigravity');

      const res = await fetch('https://api.cloudinary.com/v1_1/dnw1f6vw/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error("Cloudinary upload failed.");
      
      const data = await res.json();
      const imageUrl = data.secure_url;
      
      await addDoc(collection(db, 'photos'), {
        url: imageUrl,
        title,
        author: currentUser.displayName,
        likes: 0,
        likedBy: [],
        timestamp: serverTimestamp()
      });
      
      announce("Image uploaded successfully!");
      closePostDialog();
    } catch (err) {
      console.warn("Handled Upload Error:", err);
      showError("Upload error: " + err.message);
      announce(`Upload failed: ${err.message}`, true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLike = async (photoId) => {
    if (!currentUser) {
      showError("PLEASE SIGN IN TO LIKE.");
      return;
    }
    const photoRef = doc(db, 'photos', photoId);
    const photo = photos.find(p => p.id === photoId);
    
    if (!photo) return;
    
    const hasLiked = photo.likedBy && photo.likedBy.includes(currentUser.uid);
    
    try {
      if (hasLiked) {
        await updateDoc(photoRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid)
        });
        
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto(prev => ({ 
            ...prev, 
            likes: Math.max(0, (prev.likes || 0) - 1),
            likedBy: (prev.likedBy || []).filter(uid => uid !== currentUser.uid)
          }));
        }
      } else {
        await updateDoc(photoRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid)
        });
        
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto(prev => ({ 
            ...prev, 
            likes: (prev.likes || 0) + 1,
            likedBy: [...(prev.likedBy || []), currentUser.uid]
          }));
        }
      }
    } catch (err) {
      console.error("Error updating like:", err);
      showError("Failed to update like status.");
    }
  };

  return (
    <>
      {/* ARIA Announcers */}
      <div role="status" aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {announcement}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {assertiveAnnouncement}
      </div>

      <header className="navbar">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textDecoration: 'none' }} aria-label="Home">
          <svg role="img" aria-label="Doom Generation Logo" width="64" height="64" viewBox="0 0 100 80" fill="none" style={{ overflow: 'visible', flexShrink: 0 }}>
            {/* The 'd' in Sand */}
            <path d="M 35 40 C 35 25, 15 25, 15 40 C 15 55, 35 55, 35 40 L 35 15 L 35 45 C 35 60, 45 55, 50 40" 
                  stroke="var(--text-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" 
                  style={{ filter: 'drop-shadow(2px 2px 0px var(--accent))' }} />
            {/* The 'g' in Neon Cyan */}
            <path d="M 50 40 C 50 25, 70 25, 70 40 C 70 55, 50 55, 50 40 M 70 25 L 70 60 C 70 80, 50 75, 50 65" 
                  stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" 
                  style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }} />
          </svg>
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Doom Generation Photo Gallery</h1>
        </a>
        <div className="auth-container">
          {currentUser ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
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
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="gallery-container">
        {photos.length === 0 && (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem' }}>
            <h2>GALLERY EMPTY</h2>
            <p>The real-time database is currently empty.</p>
            {currentUser && (
              <button className="btn btn-primary" onClick={seedDatabase} style={{ marginTop: '1rem' }}>
                [ SEED DEFAULT PHOTOS ]
              </button>
            )}
          </div>
        )}
        {photos.map((photo, index) => {
          const isLcpCandidate = index < 2;
          return (
            <article
              key={photo.id}
              data-photo-id={photo.id}
              className="gallery-item"
            >
              <button
                type="button"
                className="image-container"
                aria-haspopup="dialog"
                aria-label={`View photo ${photo.title} by ${photo.author}`}
                onClick={(e) => openLightbox(photo, e)}
              >
                <img
                  src={getOptimizedUrl(photo.url, 800)}
                  alt={photo.title}
                  width="800"
                  height="800"
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
                  src={getOptimizedUrl(selectedPhoto.url, 1600)}
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
    </>
  );
}

export default App;
