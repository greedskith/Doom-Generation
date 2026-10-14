import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { flushSync } from 'react-dom';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, increment, serverTimestamp, query, orderBy, writeBatch, arrayUnion, arrayRemove, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { auth, provider, db } from './firebase.js';
import { getImageDimensions } from './utils/image.js';

import { AuthButtons } from './components/AuthButtons.jsx';
import { PhotoGrid } from './components/PhotoGrid.jsx';

const BuilderDialog = lazy(() => import('./components/BuilderDialog.jsx').then((m) => ({ default: m.BuilderDialog })));
const PostDialog = lazy(() => import('./components/PostDialog.jsx').then((m) => ({ default: m.PostDialog })));
const Lightbox = lazy(() => import('./components/Lightbox.jsx').then((m) => ({ default: m.Lightbox })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx').then((m) => ({ default: m.AdminDashboard })));

const ADMIN_EMAIL = 'sagarranjan993@gmail.com';


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isUploader, setIsUploader] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const selectedPhoto = photos.find(p => p.id === selectedPhotoId) || null;
  const [file, setFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
  const [uploadFormKey, setUploadFormKey] = useState(0);
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
  const dashboardDialogRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const selectedPhotoIdRef = useRef(null);
  const announcementTimerRef = useRef(null);
  const assertiveTimerRef = useRef(null);
  const uploadPreviewUrlRef = useRef(null);

  useEffect(() => () => {
    if (uploadPreviewUrlRef.current) {
      URL.revokeObjectURL(uploadPreviewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    selectedPhotoIdRef.current = selectedPhotoId;
  }, [selectedPhotoId]);

  const openBuilderDialog = (event) => {
    lastFocusedElementRef.current = event?.currentTarget || null;
    builderDialogRef.current?.showModal();
  };

  const closeBuilderDialog = () => {
    builderDialogRef.current?.close();
    lastFocusedElementRef.current?.focus();
  };

  const openDashboard = (event) => {
    lastFocusedElementRef.current = event?.currentTarget || null;
    dashboardDialogRef.current?.showModal();
  };

  const closeDashboard = () => {
    dashboardDialogRef.current?.close();
    lastFocusedElementRef.current?.focus();
  };

  const isAdminUser = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email));
          setIsUploader(adminDoc.exists());
        } catch {
          setIsUploader(false);
        }
        // Track registered user
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null,
            lastLogin: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          // Non-critical — don't block auth flow
          console.warn('Failed to save user data:', e);
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

      const activePhotoId = selectedPhotoIdRef.current;
      if (activePhotoId && !fetchedPhotos.some((photo) => photo.id === activePhotoId)) {
        lightboxDialogRef.current?.close();
        selectedPhotoIdRef.current = null;
        setSelectedPhotoId(null);
        setAnalysisError(null);
        setIsEditingTitle(false);
      }

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

  const handleFileSelected = (nextFile) => {
    if (uploadPreviewUrlRef.current) {
      URL.revokeObjectURL(uploadPreviewUrlRef.current);
      uploadPreviewUrlRef.current = null;
    }

    if (nextFile) {
      const nextPreviewUrl = URL.createObjectURL(nextFile);
      uploadPreviewUrlRef.current = nextPreviewUrl;
      setUploadPreviewUrl(nextPreviewUrl);
    } else {
      setUploadPreviewUrl(null);
    }

    setFile(nextFile);
  };

  const resetUploadForm = () => {
    handleFileSelected(null);
    setTitle('');
    setIsUploading(false);
    setUploadFormKey((current) => current + 1);
  };

  const openPostDialog = (e) => {
    lastFocusedElementRef.current = e?.currentTarget || null;
    postDialogRef.current?.showModal();
  };

  const closePostDialog = () => {
    postDialogRef.current?.close();
    resetUploadForm();
    lastFocusedElementRef.current?.focus();
  };

  const openLightbox = (photo, e) => {
    const cardEl = e?.currentTarget;
    lastFocusedElementRef.current = cardEl || null;
    const cardImg = cardEl?.querySelector('.image-container img');

    setIsEditingTitle(false);
    setAnalysisError(null);

    if (!document.startViewTransition) {
      selectedPhotoIdRef.current = photo.id;
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
        selectedPhotoIdRef.current = photo.id;
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
      selectedPhotoIdRef.current = null;
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
        selectedPhotoIdRef.current = null;
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
      announce("Work removed from archive.");
      closeLightbox();
    } catch (err) {
      console.error("Failed to delete photo:", err);
      showError("Unable to remove work from archive.");
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

  const handleToggleDoodle = () => {
    if (!selectedPhoto) return;
    setDoodleVisiblePhotoIds((prev) => ({
      ...prev,
      [selectedPhoto.id]: !prev[selectedPhoto.id]
    }));
  };

  const handleAnalyse = async () => {
    if (!selectedPhoto) return;
    const targetId = selectedPhoto.id;
    const targetUrl = selectedPhoto.url;
    if (analyzingPhotoId === targetId) return;

    announce("Reading frame composition...");
    setAnalyzingPhotoId(targetId);
    setAnalysisError(null);

    try {
      const { analyzeComposition, sanitizeAnalysis } = await import('./services/gemini.js');
      const raw = await analyzeComposition(targetUrl);
      const result = sanitizeAnalysis(raw);
      setLocalAnalyses((prev) => ({ ...prev, [targetId]: result }));
      try {
        await updateDoc(doc(db, 'photos', targetId), { analysis: result });
      } catch (firestoreErr) {
        console.info("Analysis preserved in local session:", firestoreErr?.message);
      }
      announce("Composition reading complete.");
    } catch (err) {
      if (selectedPhotoId === targetId) {
        setAnalysisError(err.message);
      }
      announce(`Error analyzing composition: ${err.message}`, true);
    } finally {
      setAnalyzingPhotoId((prev) => (prev === targetId ? null : prev));
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !currentUser) return;
    announce("Uploading image...");
    setIsUploading(true);
    
    try {
      let statRef = doc(db, 'user_stats', currentUser.uid);

      const [adminDoc, statDoc] = await Promise.all([
        getDoc(doc(db, 'admins', currentUser.email || 'invalid')),
        getDoc(statRef)
      ]);

      const isAdmin = adminDoc.exists();
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
        showError("Weekly upload quota reached (maximum 5 works per week).");
        setIsUploading(false);
        return;
      }

      const dimensions = await getImageDimensions(file);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        showError("Upload configuration is missing. Please contact support.");
        setIsUploading(false);
        return;
      }

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
      showError("Please sign in to appreciate works.");
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
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveAnnouncement}
      </div>

      {globalError && (
        <div role="alert" className="error-toast">
          {globalError}
        </div>
      )}

      <div className="app-shell">
        <header className="site-rail">
          <a href="/" className="brand-lockup" aria-label="Doom Generation home">
            <span className="brand-monogram" aria-hidden="true">DG</span>
            <span className="brand-wordmark">Doom Generation</span>
          </a>
          <p className="rail-context" aria-hidden="true">Open image archive</p>
          <AuthButtons
            currentUser={currentUser}
            isUploader={isUploader}
            isAdminUser={isAdminUser}
            openBuilderDialog={openBuilderDialog}
            openPostDialog={openPostDialog}
            openDashboard={openDashboard}
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
      </div>

      <Suspense fallback={null}>
        <PostDialog
          postDialogRef={postDialogRef}
          handleBackdropClick={handleBackdropClick}
          closePostDialog={closePostDialog}
          handleUpload={handleUpload}
          file={file}
          previewUrl={uploadPreviewUrl}
          uploadFormKey={uploadFormKey}
          onFileSelected={handleFileSelected}
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

        <AdminDashboard
          currentUser={currentUser}
          dashboardDialogRef={dashboardDialogRef}
          handleBackdropClick={handleBackdropClick}
          closeDashboard={closeDashboard}
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
          handleToggleDoodle={handleToggleDoodle}
          analysisError={analysisError}
          handleLike={handleLike}
        />
      </Suspense>
    </>
  );
}

export default App;
