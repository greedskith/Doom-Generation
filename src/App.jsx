import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { analyzeComposition } from './services/gemini.js';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, increment, serverTimestamp, query, orderBy, writeBatch, arrayUnion, arrayRemove, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, provider, db } from './firebase.js';
import { getImageDimensions } from './utils/image.js';

import { AuthButtons } from './components/AuthButtons.jsx';
import { BuilderDialog } from './components/BuilderDialog.jsx';
import { PostDialog } from './components/PostDialog.jsx';
import { Lightbox } from './components/Lightbox.jsx';
import { PhotoGrid } from './components/PhotoGrid.jsx';


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isUploader, setIsUploader] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const selectedPhoto = photos.find(p => p.id === selectedPhotoId) || null;
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Gemini Analysis State - Isolated per photo ID
  const [analyzingPhotoId, setAnalyzingPhotoId] = useState(null);
  const [doodleVisiblePhotoIds, setDoodleVisiblePhotoIds] = useState({});
  const [localAnalyses, setLocalAnalyses] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');

  const currentAnalysis = selectedPhoto?.analysis || (selectedPhoto ? localAnalyses[selectedPhoto.id] : null);
  const isCurrentPhotoAnalyzing = Boolean(selectedPhoto && analyzingPhotoId === selectedPhoto.id);
  const isDoodleVisible = Boolean(selectedPhoto && currentAnalysis && doodleVisiblePhotoIds[selectedPhoto.id]);

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
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email));
          setIsUploader(adminDoc.exists());
        } catch (e) {
          setIsUploader(false);
        }
      } else {
        setIsUploader(false);
      }
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
      setAnalysisError(null);
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

    // If photo has an existing analysis and visibility hasn't been set yet, show it by default
    if ((photo.analysis || localAnalyses[photo.id]) && doodleVisiblePhotoIds[photo.id] === undefined) {
      setDoodleVisiblePhotoIds(prev => ({ ...prev, [photo.id]: true }));
    }

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

    setAnalysisError(null);
    setIsEditingTitle(false);

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
    const targetId = selectedPhoto.id;
    const targetUrl = selectedPhoto.url;
    const existingAnalysis = selectedPhoto.analysis || localAnalyses[targetId];

    // If analysis already exists for this photo, toggle its doodle overlay
    if (existingAnalysis) {
      const nextVisible = !doodleVisiblePhotoIds[targetId];
      setDoodleVisiblePhotoIds(prev => ({
        ...prev,
        [targetId]: nextVisible
      }));
      announce(nextVisible ? "Visual doodle overlaid." : "Visual doodle hidden.");
      return;
    }

    // Guard against multiple clicks while currently analyzing this photo
    if (analyzingPhotoId === targetId) return;

    announce("Analyzing composition...");
    setAnalyzingPhotoId(targetId);
    setAnalysisError(null);

    try {
      const result = await analyzeComposition(targetUrl);
      setLocalAnalyses(prev => ({ ...prev, [targetId]: result }));
      setDoodleVisiblePhotoIds(prev => ({ ...prev, [targetId]: true }));
      try {
        await updateDoc(doc(db, 'photos', targetId), { analysis: result });
      } catch (firestoreErr) {
        // If Firestore write fails (e.g. non-owner), analysis remains active in local session
        console.info("Analysis preserved in local session:", firestoreErr?.message);
      }
      announce("Analysis complete. Visual doodle overlaid.");
    } catch (err) {
      if (selectedPhotoId === targetId) {
        setAnalysisError(err.message);
      }
      announce(`Error analyzing composition: ${err.message}`, true);
    } finally {
      setAnalyzingPhotoId(prev => (prev === targetId ? null : prev));
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
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }} aria-label="Home">
          <svg className="navbar-logo" role="img" aria-label="Doom Generation Logo" viewBox="0 0 100 80" fill="none" style={{ overflow: 'visible', flexShrink: 0 }}>
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
        <AuthButtons
          currentUser={currentUser}
          isUploader={isUploader}
          openBuilderDialog={openBuilderDialog}
          openPostDialog={openPostDialog}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />
      </header>

      <PhotoGrid
        photos={photos}
        lcpThreshold={lcpThreshold}
        currentUser={currentUser}
        openLightbox={openLightbox}
        handleLike={handleLike}
      />

      <PostDialog
        postDialogRef={postDialogRef}
        handleBackdropClick={handleBackdropClick}
        closePostDialog={closePostDialog}
        handleUpload={handleUpload}
        file={file}
        setFile={setFile}
        title={title}
        setTitle={setTitle}
        isUploading={isUploading}
        showError={showError}
      />

      <BuilderDialog
        builderDialogRef={builderDialogRef}
        handleBackdropClick={handleBackdropClick}
        closeBuilderDialog={closeBuilderDialog}
      />

      <Lightbox
        lightboxDialogRef={lightboxDialogRef}
        handleBackdropClick={handleBackdropClick}
        closeLightbox={closeLightbox}
        selectedPhoto={selectedPhoto}
        currentUser={currentUser}
        isEditingTitle={isEditingTitle}
        setIsEditingTitle={setIsEditingTitle}
        editTitleValue={editTitleValue}
        setEditTitleValue={setEditTitleValue}
        handleSaveTitle={handleSaveTitle}
        handleDeletePhoto={handleDeletePhoto}
        handleAnalyse={handleAnalyse}
        isCurrentPhotoAnalyzing={isCurrentPhotoAnalyzing}
        currentAnalysis={currentAnalysis}
        isDoodleVisible={isDoodleVisible}
        analysisError={analysisError}
        handleLike={handleLike}
      />
    </>
  );
}

export default App;
