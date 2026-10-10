import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { analyzeComposition } from './services/gemini.js';
import { CompositionDoodle } from './components/CompositionDoodle.jsx';

import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, increment, serverTimestamp, query, orderBy, writeBatch, arrayUnion, arrayRemove, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, provider, db } from './firebase.js';


const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.Image) {
      resolve({ width: 800, height: 800 });
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 800 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 800, height: 800 });
    };
    img.src = objectUrl;
  });
};

const getOptimizedUrl = (url, width) => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${parts[1]}`;
    }
  }
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('auto', 'format');
      if (!parsed.searchParams.has('fit')) parsed.searchParams.set('fit', 'crop');
      if (!parsed.searchParams.has('q')) parsed.searchParams.set('q', '80');
      return parsed.toString();
    } catch {
      return url;
    }
  }
  return url;
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const selectedPhoto = photos.find(p => p.id === selectedPhotoId) || null;
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Gemini Analysis State
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDoodle, setShowDoodle] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');

  // Dynamic LCP candidate determination based on responsive viewport width (BUG-12)
  const [lcpThreshold, setLcpThreshold] = useState(() => {
    if (typeof window === 'undefined') return 4;
    if (window.matchMedia('(min-width: 1440px)').matches) return 6;
    if (window.matchMedia('(min-width: 768px)').matches) return 4;
    return 2;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateThreshold = () => {
      if (window.matchMedia('(min-width: 1440px)').matches) {
        setLcpThreshold(6);
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setLcpThreshold(4);
      } else {
        setLcpThreshold(2);
      }
    };

    const mqWide = window.matchMedia('(min-width: 1440px)');
    const mqDesktop = window.matchMedia('(min-width: 768px)');

    mqWide.addEventListener('change', updateThreshold);
    mqDesktop.addEventListener('change', updateThreshold);

    return () => {
      mqWide.removeEventListener('change', updateThreshold);
      mqDesktop.removeEventListener('change', updateThreshold);
    };
  }, []);

  const announce = (message, assertive = false) => {
    if (assertive) {
      setAssertiveAnnouncement(message);
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
      assertiveTimerRef.current = setTimeout(() => setAssertiveAnnouncement(''), 6000);
    } else {
      setAnnouncement(message);
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
      announcementTimerRef.current = setTimeout(() => setAnnouncement(''), 6000);
    }
  };

  const showError = (message) => {
    setGlobalError(message);
    announce("Error: " + message, true);
    setTimeout(() => setGlobalError(null), 5000);
  };

  const postDialogRef = useRef(null);
  const lightboxDialogRef = useRef(null);
  const builderDialogRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const announcementTimerRef = useRef(null);
  const assertiveTimerRef = useRef(null);

  const openBuilderDialog = () => builderDialogRef.current?.showModal();
  const closeBuilderDialog = () => builderDialogRef.current?.close();

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

  useEffect(() => {
    if (selectedPhotoId && !photos.find(p => p.id === selectedPhotoId)) {
      lightboxDialogRef.current?.close();
      setSelectedPhotoId(null);
      setAnalysis(null);
      setShowDoodle(false);
      setIsEditingTitle(false);
    }
  }, [photos, selectedPhotoId]);

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

    setIsEditingTitle(false);
    setAnalysisError(null);

    if (!document.startViewTransition) {
      setSelectedPhotoId(photo.id);
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
        setSelectedPhotoId(photo.id);
      });
      lightboxDialogRef.current?.showModal();
      
      const lightboxImg = lightboxDialogRef.current?.querySelector('.lightbox-image');
      if (lightboxImg) {
        lightboxImg.style.viewTransitionName = 'active-photo-morph';
      }
    });

    transition.finished.finally(() => {
      if (cardImg) {
        cardImg.style.viewTransitionName = 'none';
      }
      const lightboxImg = lightboxDialogRef.current?.querySelector('.lightbox-image');
      if (lightboxImg) {
        lightboxImg.style.viewTransitionName = 'none';
      }
    });
  };

  const closeLightbox = () => {
    if (!selectedPhotoId) return;
    const photoId = selectedPhotoId;
    const cardImg = document.querySelector(`[data-photo-id="${photoId}"] .image-container img`);
    const lightboxImg = lightboxDialogRef.current?.querySelector('.lightbox-image');

    if (!document.startViewTransition) {
      lightboxDialogRef.current?.close();
      setSelectedPhotoId(null);
      lastFocusedElementRef.current?.focus();
      return;
    }

    if (lightboxImg) {
      lightboxImg.style.viewTransitionName = 'active-photo-morph';
    }
    if (cardImg) {
      cardImg.style.viewTransitionName = 'none';
    }

    const transition = document.startViewTransition(() => {
      if (cardImg) {
        cardImg.style.viewTransitionName = 'active-photo-morph';
      }
      flushSync(() => {
        lightboxDialogRef.current?.close();
        setSelectedPhotoId(null);
        setAnalysis(null);
        setShowDoodle(false);
        setIsEditingTitle(false);
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
    if (e.target === e.currentTarget) {
      closeFn();
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedPhoto || selectedPhoto.userId !== currentUser?.uid) return;
    try {
      await deleteDoc(doc(db, 'photos', selectedPhoto.id));
      announce("Photo deleted successfully!");
      closeLightbox();
    } catch (err) {
      console.error("Failed to delete photo:", err);
      showError("Failed to delete photo.");
    }
  };

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!selectedPhoto || selectedPhoto.userId !== currentUser?.uid || !editTitleValue.trim()) return;
    try {
      await updateDoc(doc(db, 'photos', selectedPhoto.id), { title: editTitleValue.trim() });
      setIsEditingTitle(false);
      announce("Title updated successfully!");
    } catch (err) {
      console.error("Failed to update title:", err);
      showError("Failed to update title.");
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

    if (selectedPhoto.analysis) {
      setAnalysis(selectedPhoto.analysis);
      setShowDoodle(true);
      announce("Loaded cached analysis.");
      return;
    }

    announce("Analyzing composition...");
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeComposition(selectedPhoto.url);
      await updateDoc(doc(db, 'photos', selectedPhoto.id), { analysis: result });
      setAnalysis(result);
      setShowDoodle(true);
      announce("Analysis complete. Visual doodle overlaid.");
    } catch (err) {
      setAnalysisError(err.message);
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
      const adminDoc = await getDoc(doc(db, 'admins', currentUser.email || 'invalid'));
      const isAdmin = adminDoc.exists();

      let statRef = doc(db, 'user_stats', currentUser.uid);
      let statDoc = await getDoc(statRef);
      let uploadsThisWeek = 0;
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;

      if (statDoc.exists()) {
        const data = statDoc.data();
        const start = data.weekStartDate ? data.weekStartDate.toMillis() : 0;
        if (now - start < oneWeek) {
          uploadsThisWeek = data.uploadsThisWeek || 0;
        }
      }

      if (!isAdmin && uploadsThisWeek >= 5) {
        showError("[ REJECTED: WEEKLY LIMIT REACHED ]");
        setIsUploading(false);
        return;
      }

      const dimensions = await getImageDimensions(file);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dnw1f6vw';
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'antigravity';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Cloudinary upload failed.");
      }

      const data = await res.json();
      const imageUrl = data.secure_url;
      
      const batch = writeBatch(db);
      const newPhotoRef = doc(collection(db, 'photos'));
      
      batch.set(newPhotoRef, {
        url: imageUrl,
        title: title.trim(),
        author: currentUser.displayName || 'Anonymous',
        userId: currentUser.uid,
        likes: 0,
        likedBy: [],
        width: data.width || dimensions.width,
        height: data.height || dimensions.height,
        timestamp: serverTimestamp()
      });
      
      if (!isAdmin) {
        const isNewWeek = !statDoc.exists() || (statDoc.exists() && now - (statDoc.data().weekStartDate?.toMillis() || 0) >= oneWeek);
        if (isNewWeek) {
          batch.set(statRef, { uploadsThisWeek: 1, weekStartDate: serverTimestamp() });
        } else {
          batch.update(statRef, { uploadsThisWeek: increment(1) });
        }
      }

      await batch.commit();

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
      } else {
        await updateDoc(photoRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid)
        });
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

      {globalError && (
        <div role="alert" className="error-toast" style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#ff3366',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          border: '2px solid #000',
          boxShadow: '4px 4px 0px #000',
          zIndex: 1000,
          fontWeight: 'bold',
          fontFamily: 'monospace'
        }}>
          {globalError}
        </div>
      )}

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
          <button type="button" className="btn btn-secondary" onClick={openBuilderDialog}>
            [ BUILDER ]
          </button>
          {currentUser ? (
            <>
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
            </>
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

      {/* About the Builder Dialog */}
      <dialog ref={builderDialogRef} className="brutalist-dialog post-dialog" aria-labelledby="builder-dialog-title" onClick={(e) => handleBackdropClick(e, closeBuilderDialog)} onCancel={closeBuilderDialog}>
        <div className="dialog-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 id="builder-dialog-title" style={{ margin: 0, textBox: 'trim-both cap alphabetic' }}>ABOUT THE BUILDER</h2>
            <button type="button" className="btn btn-secondary" onClick={closeBuilderDialog} aria-label="Close builder dialog" style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>[ X ]</button>
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src="/builder.jpg"
              alt="Sagar Ranjan"
              style={{
                width: '160px',
                height: '160px',
                objectFit: 'cover',
                objectPosition: 'top',
                border: 'none',
                flexShrink: 0,
                filter: 'grayscale(20%)',
              }}
            />
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <strong style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}>SAGAR RANJAN</strong>
                <p style={{ fontSize: '1rem', lineHeight: '1.7', margin: 0, color: 'var(--text-primary)', opacity: 0.85 }}>
                  He built this.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <a href="https://github.com/greedskith" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', padding: '0.75rem', minWidth: '120px' }}>[ GITHUB ]</a>
                <a href="https://twitter.com/greedskith" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', padding: '0.75rem', minWidth: '120px' }}>[ TWITTER ]</a>
              </div>
            </div>
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
                  [ CLOSE ]
                </button>
              </div>
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
                <CompositionDoodle analysis={analysis} visible={showDoodle} />
                {isAnalyzing && (
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
    </>
  );
}

export default App;
