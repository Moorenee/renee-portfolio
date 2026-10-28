/**
 * MOO RENEE — PORTFOLIO CMS EDITOR CONTROLLER
 * Full management of Identity, About, Projects Archive, Categories, Sub-labels,
 * Top Headers, Dynamic Custom Sections, and Triple-Confirm Deletion.
 */

async function initAdmin() {
  try { updateCloudUI(); } catch (e) {}
  let currentData = await window.PortfolioDB.getData();

  // Subscribe to real-time database updates from Cloud Firestore
  if (window.PortfolioDB && window.PortfolioDB.subscribe) {
    window.PortfolioDB.subscribe((freshData) => {
      if (!hasUnsavedChanges && freshData) {
        currentData = freshData;
        try { populateAllForms(); } catch(e) {}
        try { updateRawJsonInspector(); } catch(e) {}
      }
    });
  }

  const toast = document.getElementById('admin-toast');

  function showToast(msg, isError = false) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.borderLeftColor = isError ? '#ef4444' : '#22c55e';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  // Base64 helper for image uploads with high-resolution clarity and crisp rendering
  function fileToBase64(file, maxWidth = 2800, quality = 0.94) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = error => reject(error);
      reader.onload = (e) => {
        const rawResult = e.target.result;
        if (file.type === 'image/svg+xml') {
          resolve(rawResult);
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawResult);
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          // If already a clean JPEG within bounds and reasonable size (< 1.8MB), preserve raw file bytes
          if (file.type === 'image/jpeg' && w <= maxWidth && file.size < 1800000) {
            resolve(rawResult);
            return;
          }
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Pure white backing to prevent transparency bleed-through or dark/blue corruption
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          // Use true sRGB JPEG to guarantee accurate color fidelity (eliminates WebP YUV blue/cyan chroma shift)
          try {
            const jpegUrl = canvas.toDataURL('image/jpeg', Math.max(quality, 0.90));
            if (jpegUrl && jpegUrl.startsWith('data:image/jpeg')) {
              resolve(jpegUrl);
              return;
            }
          } catch(we) {}
          resolve(rawResult);
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ================= 0. AUTHENTICATION GATE (DIRECT URL ACCESS) ================= */
  const loginOverlay = document.getElementById('admin-login-screen');
  const loginForm = document.getElementById('admin-login-form');
  const loginUser = document.getElementById('admin-user-input');
  const loginPass = document.getElementById('admin-passcode-input');
  const loginError = document.getElementById('admin-login-error');
  const btnLogout = document.getElementById('btn-admin-logout');

  function checkAdminAuth() {
    try { localStorage.removeItem('renee_admin_authenticated'); } catch(e) {}
    const isAuth = sessionStorage.getItem('renee_admin_authenticated') === 'true';
    if (!isAuth) {
      if (loginOverlay) {
        loginOverlay.classList.add('open');
        loginOverlay.style.display = 'flex';
      }
      setTimeout(() => { if (loginUser) loginUser.focus(); }, 100);
      return false;
    } else {
      if (loginOverlay) {
        loginOverlay.classList.remove('open');
        loginOverlay.style.display = 'none';
      }
      return true;
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = (loginUser ? loginUser.value : '').trim();
      const p = (loginPass ? loginPass.value : '').trim();

      // Dynamic credentials check (can be changed in Admin settings)
      let currentAuth = { username: 'RENEE@MOO081706', password: '36987@RENEE6667' };
      if (window.PortfolioDB && window.PortfolioDB.getAdminAuth) {
        currentAuth = window.PortfolioDB.getAdminAuth();
      } else {
        try {
          const custom = localStorage.getItem('renee_admin_auth_custom');
          if (custom) currentAuth = JSON.parse(custom);
        } catch(e) {}
      }

      if (u.toUpperCase() === (currentAuth.username || '').toUpperCase() && p === currentAuth.password) {
        sessionStorage.setItem('renee_admin_authenticated', 'true');
        try { localStorage.removeItem('renee_admin_authenticated'); } catch(e) {}
        if (loginOverlay) {
          loginOverlay.classList.remove('open');
          loginOverlay.style.display = 'none';
        }
        if (loginError) loginError.style.display = 'none';
        if (window.PortfolioDB && window.PortfolioDB.channel) {
          try {
            window.PortfolioDB.channel.postMessage({ type: 'AUTH_LOGIN' });
          } catch(err) {}
        }
        showToast('AUTHENTICATED: WELCOME TO PORTFOLIO STUDIO');
      } else {
        if (loginError) loginError.style.display = 'block';
        if (loginPass) {
          loginPass.value = '';
          loginPass.focus();
        }
      }
    });
  }

  // Initial gate check
  checkAdminAuth();

  /* ================= ADMIN LOGOUT & EXIT CONTROLLER ================= */
  const adminLogoutModal = document.getElementById('admin-logout-modal');
  const adminLogoutConfirm = document.getElementById('admin-logout-confirm-screen');
  const adminLogoutSuccess = document.getElementById('admin-logout-success-screen');
  const btnAdminModalSave = document.getElementById('btn-admin-modal-save');
  const btnAdminModalDiscard = document.getElementById('btn-admin-modal-discard');
  const btnAdminModalCancel = document.getElementById('btn-admin-modal-cancel');
  const btnAdminModalClose = document.getElementById('btn-admin-logout-close') || document.getElementById('btn-admin-modal-close');

  function openAdminLogoutModal() {
    if (!adminLogoutModal) return;
    if (adminLogoutConfirm) adminLogoutConfirm.style.display = 'block';
    if (adminLogoutSuccess) adminLogoutSuccess.style.display = 'none';
    adminLogoutModal.classList.add('open');
    adminLogoutModal.classList.add('active');
  }

  function closeAdminLogoutModal() {
    if (!adminLogoutModal) return;
    adminLogoutModal.classList.remove('open');
    adminLogoutModal.classList.remove('active');
  }

  async function performDirectLogout() {
    clearTimeout(syncDraftTimer);
    clearTimeout(autoCommitTimer);
    if (activeProject) {
      try {
        syncActiveProjectLive(false);
        if (window.PortfolioDB && window.PortfolioDB.saveData) {
          await window.PortfolioDB.saveData(currentData);
        }
      } catch(err) {
        console.warn('Pre-logout auto-save warning:', err);
      }
    }
    sessionStorage.removeItem('renee_admin_authenticated');
    localStorage.removeItem('renee_admin_authenticated');
    if (window.PortfolioDB && window.PortfolioDB.channel) {
      try { window.PortfolioDB.channel.postMessage({ type: 'AUTH_LOGOUT' }); } catch(err) {}
    }
    window.location.replace('index.html#home');
  }

  function handleLogoutClick(e) {
    if (e) e.preventDefault();
    if (activeProject) {
      try { syncActiveProjectLive(false); } catch(err) {}
      hasUnsavedChanges = true;
    }
    const hasPending = hasUnsavedChanges || (window.PortfolioDB && window.PortfolioDB.hasDraft && window.PortfolioDB.hasDraft());
    if (!hasPending) {
      performDirectLogout();
      return;
    }
    openAdminLogoutModal();
  }

  // Attach to header logout button and sidebar logout button
  document.querySelectorAll('#btn-admin-logout, #btn-sidebar-logout, .sidebar-logout-btn').forEach(btn => {
    btn.addEventListener('click', handleLogoutClick);
  });

  // Dedicated handler for EXIT TO SITE button: saves any pending edits and returns to index.html without destroying session
  const btnViewSite = document.getElementById('btn-view-site');
  if (btnViewSite) {
    btnViewSite.addEventListener('click', async (e) => {
      e.preventDefault();
      if (hasUnsavedChanges) {
        await executeSave('CHANGES');
      }
      window.location.href = 'index.html#home';
    });
  }

  if (btnAdminModalCancel) {
    btnAdminModalCancel.addEventListener('click', closeAdminLogoutModal);
  }
  if (btnAdminModalClose) {
    btnAdminModalClose.addEventListener('click', closeAdminLogoutModal);
  }
  if (adminLogoutModal) {
    adminLogoutModal.addEventListener('click', (e) => {
      if (e.target === adminLogoutModal) closeAdminLogoutModal();
    });
  }

  // Escape key to dismiss logout modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && adminLogoutModal && adminLogoutModal.classList.contains('open')) {
      closeAdminLogoutModal();
    }
  });

  if (btnAdminModalDiscard) {
    btnAdminModalDiscard.addEventListener('click', async (e) => {
      e.preventDefault();
      clearTimeout(syncDraftTimer);
      clearTimeout(autoCommitTimer);
      if (window.PortfolioDB && window.PortfolioDB.discardDraft) {
        try {
          await window.PortfolioDB.discardDraft();
        } catch(err) {
          console.warn('Draft discard warning:', err);
        }
      }
      sessionStorage.removeItem('renee_admin_authenticated');
      localStorage.removeItem('renee_admin_authenticated');
      if (window.PortfolioDB && window.PortfolioDB.channel) {
        try { window.PortfolioDB.channel.postMessage({ type: 'AUTH_LOGOUT' }); } catch(err) {}
      }
      window.location.replace('index.html#home');
    });
  }

  if (btnAdminModalSave) {
    btnAdminModalSave.addEventListener('click', async (e) => {
      e.preventDefault();
      clearTimeout(syncDraftTimer);
      clearTimeout(autoCommitTimer);
      if (activeProject) {
        try {
          syncActiveProjectLive(false);
          closeProjectEditor();
        } catch(err) {}
      }
      try { collectIdentityData(); } catch(err) {}
      try { collectAboutHeaderAndProfile(); } catch(err) {}
      try { collectColumnTitles(); } catch(err) {}
      try { collectHeadersData(); } catch(err) {}
      if (window.PortfolioDB && window.PortfolioDB.saveData) {
        await window.PortfolioDB.saveData(currentData);
      }
      hasUnsavedChanges = false;
      sessionStorage.removeItem('renee_admin_authenticated');
      localStorage.removeItem('renee_admin_authenticated');
      if (window.PortfolioDB && window.PortfolioDB.channel) {
        try { window.PortfolioDB.channel.postMessage({ type: 'AUTH_LOGOUT' }); } catch(err) {}
      }
      if (adminLogoutConfirm) adminLogoutConfirm.style.display = 'none';
      if (adminLogoutSuccess) adminLogoutSuccess.style.display = 'block';
      setTimeout(() => {
        window.location.replace('index.html#home');
      }, 500);
    });
  }

  /* ================= 1. TAB NAVIGATION ================= */
  const navTabs = document.querySelectorAll('.editor-nav-tab');
  const panes = document.querySelectorAll('.editor-pane');

  function switchTab(tabId) {
    navTabs.forEach(t => {
      const active = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panes.forEach(p => {
      const isActive = (p.id === tabId);
      p.classList.toggle('active', isActive);
      if (isActive) {
        try { p.scrollTop = 0; } catch(e) {}
      }
    });

    // Reset scroll back to top of all scrollable containers in Admin
    try {
      const mainContainer = document.querySelector('.editor-main');
      if (mainContainer) mainContainer.scrollTop = 0;
      const contentPane = document.querySelector('.editor-content-pane');
      if (contentPane) contentPane.scrollTop = 0;
      const appShell = document.querySelector('.editor-app-shell');
      if (appShell) appShell.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch(e) {}

    if (tabId === 'tab-projects') {
      renderMainCategories();
      renderSublabels();
      renderProjectsGrid();
      renderPageVisibilityManager();
    } else if (tabId === 'tab-about') {
      renderAboutTab();
      renderPageVisibilityManager();
    } else if (tabId === 'tab-identity') {
      renderPageVisibilityManager();
    } else if (tabId === 'tab-headers') {
      populateHeadersForm();
    } else if (tabId === 'tab-backup') {
      renderPageVisibilityManager();
      populateCredentialsForm();
      updateRawJsonInspector();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  /* ================= 2. REAL-TIME AUTO-SYNC & PERMANENT SAVE ================= */
  let syncDraftTimer = null;
  let autoCommitTimer = null;
  let hasUnsavedChanges = window.PortfolioDB.hasDraft ? window.PortfolioDB.hasDraft() : false;

  const syncIndicator = document.getElementById('header-sync-indicator');
  const sidebarStatusBadge = document.getElementById('sidebar-status-badge');

  function updateSyncStatusUI() {
    if (syncIndicator) {
      if (hasUnsavedChanges) {
        syncIndicator.className = 'editor-sync-indicator draft-mode';
        syncIndicator.innerHTML = '<span class="sync-dot draft-dot"></span><span class="sync-text">LIVE SYNC ACTIVE</span>';
        syncIndicator.title = 'Real-time edits are live in preview. Changes auto-save automatically.';
      } else {
        syncIndicator.className = 'editor-sync-indicator saved-mode';
        syncIndicator.innerHTML = '<span class="sync-dot live-dot"></span><span class="sync-text">ALL SAVED PERMANENTLY</span>';
        syncIndicator.title = 'All edits are committed permanently to database.';
      }
    }
    if (sidebarStatusBadge) {
      if (hasUnsavedChanges) {
        sidebarStatusBadge.innerHTML = '<span class="sys-dot" style="background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.7);"></span> REAL-TIME LIVE SYNC';
      } else {
        sidebarStatusBadge.innerHTML = '<span class="sys-dot"></span> LIVE LOCAL DATABASE';
      }
    }
  }

  function collectAllEditorData() {
    try { collectIdentityData(); } catch(e) {}
    try { collectAboutHeaderAndProfile(); } catch(e) {}
    try { collectColumnTitles(); } catch(e) {}
    try { collectHeadersData(); } catch(e) {}
    try { if (activeProject && typeof syncActiveProjectLive === 'function') syncActiveProjectLive(false); } catch(e) {}
  }

  function broadcastDraft() {
    collectAllEditorData();
    hasUnsavedChanges = true;
    updateSyncStatusUI();
    if (window.PortfolioDB && window.PortfolioDB.saveDraft) {
      window.PortfolioDB.saveDraft(currentData);
    }
    updateRawJsonInspector();

    // Auto-commit permanently to IndexedDB, LocalStorage, and Cloud Firestore in background!
    clearTimeout(autoCommitTimer);
    autoCommitTimer = setTimeout(async () => {
      try {
        if (window.PortfolioDB && window.PortfolioDB.saveData) {
          await window.PortfolioDB.saveData(currentData);
          hasUnsavedChanges = false;
          updateSyncStatusUI();
          updateRawJsonInspector();
        }
      } catch(err) {
        console.warn('Auto-save background notice:', err);
      }
    }, 2500);
  }

  function triggerRealtimeSync(debounceMs = 120) {
    clearTimeout(syncDraftTimer);
    if (debounceMs <= 0) {
      broadcastDraft();
    } else {
      syncDraftTimer = setTimeout(broadcastDraft, debounceMs);
    }
  }

  // Initial status UI setup
  updateSyncStatusUI();

  async function executeSave(label = 'CHANGES') {
    clearTimeout(syncDraftTimer);
    clearTimeout(autoCommitTimer);
    try {
      if (activeProject) {
        try { syncActiveProjectLive(false); } catch(e) {}
      }
      collectIdentityData();
      collectAboutHeaderAndProfile();
      collectColumnTitles();
      collectHeadersData();
      
      const saveRes = await window.PortfolioDB.saveData(currentData);
      hasUnsavedChanges = false;
      updateSyncStatusUI();
      updateRawJsonInspector();

      if (saveRes && saveRes.cloudSynced) {
        showToast(`✓ ${label.toUpperCase()} SAVED TO CLOUD & LIVE WEBSITE!`);
      } else if (saveRes && saveRes.cloudError) {
        showToast(`⚠️ SAVED LOCALLY, BUT CLOUD FAILED: ${saveRes.cloudError}`, true);
      } else {
        showToast(`✓ ${label.toUpperCase()} SAVED PERMANENTLY!`);
      }
      return true;
    } catch(err) {
      console.error('Save error:', err);
      showToast('⚠️ ERROR SAVING: ' + err.message, true);
      return false;
    }
  }

  const btnGlobalSave = document.getElementById('btn-global-save');
  if (btnGlobalSave) {
    btnGlobalSave.addEventListener('click', async () => {
      await executeSave('ALL CHANGES');
    });
  }

  /* ================= 3. TAB 01: IDENTITY & CONTACT ================= */
  const formIdentity = document.getElementById('form-identity');
  const idPhotoUrl = document.getElementById('id-photo-url');
  const idPhotoFile = document.getElementById('id-photo-file');
  const idPhotoPreview = document.getElementById('id-photo-preview');

  function populateIdentityForm() {
    const p = currentData.profile || {};
    const h = currentData.home || {};

    document.getElementById('id-name').value = p.name || '';
    document.getElementById('id-role').value = p.degree || '';
    document.getElementById('id-headline').value = p.headline || '';
    document.getElementById('id-years').value = p.years || '';
    document.getElementById('id-institution').value = p.institution || '';
    document.getElementById('id-status').value = p.statusText || '';
    document.getElementById('id-coordinates').value = p.coordinates || '';
    document.getElementById('id-bio').value = p.shortBio || '';
    document.getElementById('id-photo-url').value = p.photoUrl || '';
    if (idPhotoPreview) idPhotoPreview.src = p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
    document.getElementById('id-email').value = p.email || '';
    document.getElementById('id-phone').value = p.phone || '';
    document.getElementById('id-behance').value = p.behanceUrl || '';
    document.getElementById('id-linktree').value = p.linktreeUrl || '';
    document.getElementById('id-github').value = p.githubUrl || '';
    document.getElementById('id-instagram').value = p.instagramUrl || '';
    document.getElementById('id-tags').value = (p.tags || []).join(', ');
    const resEl = document.getElementById('id-resume-url');
    if (resEl) resEl.value = p.resumeUrl || '';
    const resTextEl = document.getElementById('id-resume-btn-text');
    if (resTextEl) resTextEl.value = p.resumeBtnText || 'VIEW RESUME';

    const chkProfile = document.getElementById('id-show-profile-card');
    if (chkProfile) {
      const isCardVis = (currentData.sectionVisibility && currentData.sectionVisibility.aboutProfileCard === true) ||
                        (p && p.showProfileCard === true);
      chkProfile.checked = isCardVis;
    }
    const chkProfileTab2 = document.getElementById('about-show-profile-card-tab2');
    if (chkProfileTab2) {
      const isCardVis = (currentData.sectionVisibility && currentData.sectionVisibility.aboutProfileCard === true) ||
                        (p && p.showProfileCard === true);
      chkProfileTab2.checked = isCardVis;
    }

    // Homepage Hero inputs (Image 2)
    const sv = (id, val) => { const el = document.getElementById(id); if (el) el.value = (val !== undefined && val !== null) ? val : ''; };
    sv('home-des-by-input', h.desByLabel !== undefined ? h.desByLabel : 'DES. BY');
    sv('home-designer-name-input', h.designerName !== undefined ? h.designerName : (p.name || 'MOO RENEE'));
    sv('home-discipline-sub-input', h.disciplineSub !== undefined ? h.disciplineSub : "INTERACTIVE SPATIAL DESIGN\nTAYLOR'S UNIVERSITY");
    sv('home-copyright-input', h.copyrightText !== undefined ? h.copyrightText : '©2026');
    sv('home-right-discipline-input', h.rightDiscipline !== undefined ? h.rightDiscipline : (p.degree || 'BACHELOR IN INTERACTIVE SPATIAL DESIGN (HONS)'));
    sv('home-right-years-input', h.rightYears !== undefined ? h.rightYears : (p.years || '2024 — 2026'));

    // Homepage Bottom Bar inputs (Image 1)
    sv('home-email-text-input', h.emailText !== undefined ? h.emailText : '- MOORENEE481@GMAIL.COM');
    sv('home-email-url-input', h.emailUrl !== undefined ? h.emailUrl : 'mailto:moorenee481@gmail.com');
    sv('home-phone-text-input', h.phoneText !== undefined ? h.phoneText : '+06 10-3687393');
    sv('home-phone-url-input', h.phoneUrl !== undefined ? h.phoneUrl : 'tel:+60103687393');
    sv('home-behance-text-input', h.behanceText !== undefined ? h.behanceText : (p.behanceUrl ? p.behanceUrl : ''));
    sv('home-behance-url-input', h.behanceUrl !== undefined ? h.behanceUrl : (p.behanceUrl ? p.behanceUrl : ''));
    sv('home-enter-text-input', h.enterText !== undefined ? h.enterText : '- ENTER PORTFOLIO ->');
    sv('home-enter-url-input', h.enterUrl !== undefined ? h.enterUrl : '#projects');
  }

  if (idPhotoUrl) {
    idPhotoUrl.addEventListener('input', () => {
      const url = idPhotoUrl.value.trim();
      if (idPhotoPreview) idPhotoPreview.src = url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
      const abPrev = document.getElementById('about-photo-preview-tab2');
      const abUrl = document.getElementById('about-photo-url-tab2');
      if (abPrev) abPrev.src = url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
      if (abUrl) abUrl.value = url;
      collectIdentityData();
      triggerRealtimeSync(120);
    });
  }

  if (idPhotoFile) {
    idPhotoFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const b64 = await fileToBase64(file, 1000, 0.88);
        idPhotoUrl.value = b64;
        if (idPhotoPreview) idPhotoPreview.src = b64;
        const abPrev = document.getElementById('about-photo-preview-tab2');
        const abUrl = document.getElementById('about-photo-url-tab2');
        if (abPrev) abPrev.src = b64;
        if (abUrl) abUrl.value = b64;
        collectIdentityData();
        triggerRealtimeSync(0);
      }
    });
  }

  // Real-time synchronization helper for Resume button URL & Text across all tabs
  const setupResumeSync = (urlId, textId) => {
    const urlEl = document.getElementById(urlId);
    const textEl = document.getElementById(textId);
    if (urlEl) {
      urlEl.addEventListener('input', () => {
        if (!currentData.profile) currentData.profile = {};
        currentData.profile.resumeUrl = urlEl.value.trim();
        ['id-resume-url', 'about-resume-url', 'hdr-contact-resume-url'].forEach(id => {
          if (id !== urlId) { const el = document.getElementById(id); if (el) el.value = urlEl.value.trim(); }
        });
        triggerRealtimeSync(120);
      });
    }
    if (textEl) {
      textEl.addEventListener('input', () => {
        if (!currentData.profile) currentData.profile = {};
        currentData.profile.resumeBtnText = textEl.value.trim() || 'VIEW RESUME';
        ['id-resume-btn-text', 'about-resume-btn-text', 'hdr-contact-resume-text'].forEach(id => {
          if (id !== textId) { const el = document.getElementById(id); if (el) el.value = textEl.value.trim(); }
        });
        triggerRealtimeSync(120);
      });
    }
  };

  setupResumeSync('id-resume-url', 'id-resume-btn-text');
  setupResumeSync('about-resume-url', 'about-resume-btn-text');
  setupResumeSync('hdr-contact-resume-url', 'hdr-contact-resume-text');

  function collectIdentityData() {
    if (!currentData.profile) currentData.profile = {};
    const p = currentData.profile;
    p.name = document.getElementById('id-name').value.trim();
    p.degree = document.getElementById('id-role').value.trim();
    p.headline = document.getElementById('id-headline').value.trim();
    p.years = document.getElementById('id-years').value.trim();
    p.institution = document.getElementById('id-institution').value.trim();
    p.statusText = document.getElementById('id-status').value.trim();
    p.coordinates = document.getElementById('id-coordinates').value.trim();
    p.shortBio = document.getElementById('id-bio').value.trim();
    p.photoUrl = document.getElementById('id-photo-url').value.trim();
    p.email = document.getElementById('id-email').value.trim();
    p.phone = document.getElementById('id-phone').value.trim();
    p.behanceUrl = document.getElementById('id-behance').value.trim();
    p.linktreeUrl = document.getElementById('id-linktree').value.trim();
    p.githubUrl = document.getElementById('id-github').value.trim();
    p.instagramUrl = document.getElementById('id-instagram').value.trim();
    p.tags = document.getElementById('id-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    const idResEl = document.getElementById('id-resume-url');
    if (idResEl) p.resumeUrl = idResEl.value.trim();
    const idResTextEl = document.getElementById('id-resume-btn-text');
    if (idResTextEl) p.resumeBtnText = idResTextEl.value.trim() || 'VIEW RESUME';

    const chkProfile = document.getElementById('id-show-profile-card');
    if (chkProfile) {
      if (!currentData.sectionVisibility) currentData.sectionVisibility = {};
      currentData.sectionVisibility.aboutProfileCard = chkProfile.checked;
      p.showProfileCard = chkProfile.checked;
      if (!currentData.about) currentData.about = {};
      currentData.about.showProfileCard = chkProfile.checked;
      const chkProfileTab2 = document.getElementById('about-show-profile-card-tab2');
      if (chkProfileTab2) chkProfileTab2.checked = chkProfile.checked;
    }

    // Mirror to Tab 02 About Profile inputs & Tab 04
    const mirrorToTab2 = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    mirrorToTab2('about-profile-name-tab2', p.name);
    mirrorToTab2('about-profile-phone-tab2', p.phone);
    mirrorToTab2('about-profile-email-tab2', p.email);
    mirrorToTab2('about-profile-behance-tab2', p.behanceUrl);
    mirrorToTab2('about-profile-linktree-tab2', p.linktreeUrl);
    mirrorToTab2('about-profile-tags-tab2', (p.tags || []).join(', '));
    mirrorToTab2('about-profile-headline-tab2', p.headline);
    mirrorToTab2('about-profile-bio-tab2', p.shortBio);
    mirrorToTab2('about-resume-url', p.resumeUrl);
    mirrorToTab2('about-resume-btn-text', p.resumeBtnText);
    mirrorToTab2('hdr-contact-resume-url', p.resumeUrl);
    mirrorToTab2('hdr-contact-resume-text', p.resumeBtnText);

    // Collect Homepage Hero & Bottom Bar inputs (Images 1 & 2)
    if (!currentData.home) currentData.home = {};
    const h = currentData.home;
    const gv = (id, def = '') => { const el = document.getElementById(id); return el ? el.value.trim() : def; };
    h.desByLabel = gv('home-des-by-input', 'DES. BY');
    h.designerName = gv('home-designer-name-input', p.name || 'MOO RENEE');
    h.disciplineSub = document.getElementById('home-discipline-sub-input') ? document.getElementById('home-discipline-sub-input').value.trim() : "INTERACTIVE SPATIAL DESIGN\nTAYLOR'S UNIVERSITY";
    h.copyrightText = gv('home-copyright-input', '©2026');
    h.rightDiscipline = gv('home-right-discipline-input', p.degree || 'BACHELOR IN INTERACTIVE SPATIAL DESIGN (HONS)');
    h.rightYears = gv('home-right-years-input', p.years || '2024 — 2026');
    h.emailText = document.getElementById('home-email-text-input') ? document.getElementById('home-email-text-input').value.trim() : (h.emailText || '');
    h.emailUrl = document.getElementById('home-email-url-input') ? document.getElementById('home-email-url-input').value.trim() : (h.emailUrl || '');
    h.phoneText = document.getElementById('home-phone-text-input') ? document.getElementById('home-phone-text-input').value.trim() : (h.phoneText || '');
    h.phoneUrl = document.getElementById('home-phone-url-input') ? document.getElementById('home-phone-url-input').value.trim() : (h.phoneUrl || '');
    h.behanceText = document.getElementById('home-behance-text-input') ? document.getElementById('home-behance-text-input').value.trim() : (h.behanceText || '');
    h.behanceUrl = document.getElementById('home-behance-url-input') ? document.getElementById('home-behance-url-input').value.trim() : (h.behanceUrl || '');
    h.enterText = document.getElementById('home-enter-text-input') ? document.getElementById('home-enter-text-input').value.trim() : (h.enterText || '');
    h.enterUrl = document.getElementById('home-enter-url-input') ? document.getElementById('home-enter-url-input').value.trim() : (h.enterUrl || '');
  }

  const btnSaveIdentity = document.getElementById('btn-save-identity');
  if (btnSaveIdentity) {
    btnSaveIdentity.addEventListener('click', async (e) => {
      e.preventDefault();
      await executeSave('IDENTITY & HOMEPAGE');
    });
  }

  if (formIdentity) {
    const chkProfileCard = document.getElementById('id-show-profile-card');
    if (chkProfileCard) {
      chkProfileCard.addEventListener('change', () => {
        collectIdentityData();
        renderSectionVisibilityManager();
        triggerRealtimeSync(0);
      });
    }
    formIdentity.addEventListener('input', () => {
      collectIdentityData();
      triggerRealtimeSync(120);
    });
    formIdentity.addEventListener('submit', async (e) => {
      e.preventDefault();
      await executeSave('IDENTITY & HOMEPAGE');
    });
  }

  /* ================= 4. TAB 02: ABOUT & RESUME ================= */
  function renderAboutTab() {
    if (!currentData.about) currentData.about = {};
    if (!currentData.profile) currentData.profile = {};
    const defAbout = (window.DEFAULT_PORTFOLIO_DATA && window.DEFAULT_PORTFOLIO_DATA.about) || {};
    const defProf = (window.DEFAULT_PORTFOLIO_DATA && window.DEFAULT_PORTFOLIO_DATA.profile) || {};

    if (!Array.isArray(currentData.about.technicalSkills)) {
      currentData.about.technicalSkills = [...(defAbout.technicalSkills || ["UI/UX DESIGN", "GAME DESIGN", "AR/VR DEVELOPMENT", "GRAPHIC DESIGN", "CODING", "3D MODELING"])];
    }
    if (!Array.isArray(currentData.about.personalSkills)) {
      currentData.about.personalSkills = [...(defAbout.personalSkills || ["TEAMWORK", "CREATIVITY", "TIME MANAGEMENT", "RESPONSIBILITY", "WILLINGNESS TO LEARN", "ORGANIZATION"])];
    }
    if (!Array.isArray(currentData.about.languages)) {
      currentData.about.languages = JSON.parse(JSON.stringify(defAbout.languages || [
        { language: "Chinese", proficiency: "NATIVE" },
        { language: "English", proficiency: "FLUENT" },
        { language: "Malay", proficiency: "CONVERSATIONAL" }
      ]));
    }
    if (!Array.isArray(currentData.about.experience)) {
      currentData.about.experience = JSON.parse(JSON.stringify(defAbout.experience || []));
    }
    if (!Array.isArray(currentData.about.achievements)) {
      currentData.about.achievements = JSON.parse(JSON.stringify(defAbout.achievements || []));
    }
    if (!Array.isArray(currentData.about.competitions)) {
      currentData.about.competitions = JSON.parse(JSON.stringify(defAbout.competitions || []));
    }
    if (!Array.isArray(currentData.about.education)) {
      currentData.about.education = JSON.parse(JSON.stringify(defAbout.education || []));
    }
    if (!Array.isArray(currentData.profile.stats)) {
      currentData.profile.stats = JSON.parse(JSON.stringify(defProf.stats || [
        { number: "6+", label: "YEARS STUDYING DESIGN" },
        { number: "2+", label: "PROJECTS COMPLETED" },
        { number: "10", label: "COMPETITIONS ENTERED" },
        { number: "7", label: "AWARDS & RECOGNITIONS" }
      ]));
    }

    renderAboutHeaderAndProfileEditor();
    renderColumnTitlesEditor();
    renderStatsEditor();
    renderEducationRows();
    renderSoftwareRows();
    renderLanguageRows();
    renderPillsEditor('technicalSkills', 'tech-skills-wrap');
    renderPillsEditor('personalSkills', 'pers-skills-wrap');
    renderExperienceRows();
    renderAchievementRows();
    renderCompetitionRows();
    renderCustomAboutSections();
  }

  // About Page Top Header & Profile Card Editor (Sheet 01 / Image 3)
  function renderAboutHeaderAndProfileEditor() {
    const h = currentData.headers || {};
    const about = h.about || {};
    const p = currentData.profile || {};

    // 1. Top Architectural Header inputs in Tab 02
    const abIdx = document.getElementById('about-hdr-index-tab2');
    const abTitle = document.getElementById('about-hdr-title-tab2');
    const abDisc = document.getElementById('about-hdr-disc-tab2');
    const abDesc = document.getElementById('about-hdr-desc-tab2');

    if (abIdx) abIdx.value = about.index || '01 / ABOUT ME';
    if (abTitle) abTitle.value = about.title || 'ABOUT';
    if (abDisc) abDisc.value = about.discipline !== undefined ? about.discipline : 'INTERACTIVE SPATIAL DESIGN';
    if (abDesc) abDesc.value = about.description || 'Background, education, capabilities and the experiences driving my practice.';

    // Synchronize header changes in real-time with Tab 04 if present
    [
      [abIdx, 'index', 'hdr-about-index'],
      [abTitle, 'title', 'hdr-about-title'],
      [abDisc, 'discipline', 'hdr-about-disc'],
      [abDesc, 'description', 'hdr-about-desc']
    ].forEach(([inp, key, mirrorId]) => {
      if (!inp) return;
      inp.oninput = () => {
        if (!currentData.headers) currentData.headers = {};
        if (!currentData.headers.about) currentData.headers.about = {};
        currentData.headers.about[key] = inp.value.trim();
        const mirror = document.getElementById(mirrorId);
        if (mirror) mirror.value = inp.value;
        triggerRealtimeSync(120);
      };
    });

    // 2. Profile Card inputs in Tab 02 (Image 3)
    const chkProfileTab2 = document.getElementById('about-show-profile-card-tab2');
    if (chkProfileTab2) {
      const isCardVis = (currentData.sectionVisibility && currentData.sectionVisibility.aboutProfileCard === true) ||
                        (p && p.showProfileCard === true);
      chkProfileTab2.checked = isCardVis;
      chkProfileTab2.onchange = () => {
        if (!currentData.sectionVisibility) currentData.sectionVisibility = {};
        currentData.sectionVisibility.aboutProfileCard = chkProfileTab2.checked;
        if (!currentData.profile) currentData.profile = {};
        currentData.profile.showProfileCard = chkProfileTab2.checked;
        if (!currentData.about) currentData.about = {};
        currentData.about.showProfileCard = chkProfileTab2.checked;
        const idChk = document.getElementById('id-show-profile-card');
        if (idChk) idChk.checked = chkProfileTab2.checked;
        renderSectionVisibilityManager();
        triggerRealtimeSync(0);
      };
    }

    const profPrev = document.getElementById('about-photo-preview-tab2');
    const profUrl = document.getElementById('about-photo-url-tab2');
    const profFile = document.getElementById('about-photo-file-tab2');
    const profName = document.getElementById('about-profile-name-tab2');
    const profPhone = document.getElementById('about-profile-phone-tab2');
    const profEmail = document.getElementById('about-profile-email-tab2');
    const profBehance = document.getElementById('about-profile-behance-tab2');
    const profLinktree = document.getElementById('about-profile-linktree-tab2');
    const profTags = document.getElementById('about-profile-tags-tab2');
    const profHeadline = document.getElementById('about-profile-headline-tab2');
    const profBio = document.getElementById('about-profile-bio-tab2');

    if (profPrev) profPrev.src = p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
    if (profUrl) profUrl.value = p.photoUrl || '';
    if (profName) profName.value = p.name || '';
    if (profPhone) profPhone.value = p.phone || '';
    if (profEmail) profEmail.value = p.email || '';
    if (profBehance) profBehance.value = p.behanceUrl || '';
    if (profLinktree) profLinktree.value = p.linktreeUrl || '';
    if (profTags) profTags.value = (p.tags || []).join(', ');
    if (profHeadline) profHeadline.value = p.headline || '';
    if (profBio) profBio.value = p.shortBio || '';
    const profResume = document.getElementById('about-resume-url');
    if (profResume) profResume.value = p.resumeUrl || '';
    const profResumeText = document.getElementById('about-resume-btn-text');
    if (profResumeText) profResumeText.value = p.resumeBtnText || 'VIEW RESUME';

    // Photo file upload in Tab 02
    if (profFile) {
      profFile.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const b64 = await fileToBase64(file, 1000, 0.88);
          if (profUrl) profUrl.value = b64;
          if (profPrev) profPrev.src = b64;
          if (idPhotoUrl) idPhotoUrl.value = b64;
          if (idPhotoPreview) idPhotoPreview.src = b64;
          currentData.profile.photoUrl = b64;
          triggerRealtimeSync(0);
        }
      };
    }

    if (profUrl) {
      profUrl.oninput = () => {
        const url = profUrl.value.trim();
        if (profPrev) profPrev.src = url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
        if (idPhotoUrl) idPhotoUrl.value = url;
        if (idPhotoPreview) idPhotoPreview.src = url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
        currentData.profile.photoUrl = url;
        triggerRealtimeSync(120);
      };
    }

    // Mirror with Tab 01 Identity inputs
    const syncProfileField = (inp, prop, mirrorId, isTags = false) => {
      if (!inp) return;
      inp.oninput = () => {
        if (!currentData.profile) currentData.profile = {};
        if (isTags) {
          currentData.profile.tags = inp.value.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          currentData.profile[prop] = inp.value.trim();
        }
        const mirror = document.getElementById(mirrorId);
        if (mirror) mirror.value = inp.value;
        triggerRealtimeSync(120);
      };
    };

    syncProfileField(profName, 'name', 'id-name');
    syncProfileField(profPhone, 'phone', 'id-phone');
    syncProfileField(profEmail, 'email', 'id-email');
    syncProfileField(profBehance, 'behanceUrl', 'id-behance');
    syncProfileField(profLinktree, 'linktreeUrl', 'id-linktree');
    syncProfileField(profTags, 'tags', 'id-tags', true);
    syncProfileField(profHeadline, 'headline', 'id-headline');
    syncProfileField(profBio, 'shortBio', 'id-bio');
  }

  function collectAboutHeaderAndProfile() {
    if (!currentData.headers) currentData.headers = {};
    if (!currentData.headers.about) currentData.headers.about = {};
    const gv = (id, def = '') => { const el = document.getElementById(id); return el ? el.value.trim() : def; };
    
    // Top header
    const ab = currentData.headers.about;
    ab.index = gv('about-hdr-index-tab2', ab.index || '01 / ABOUT ME');
    ab.title = gv('about-hdr-title-tab2', ab.title || 'ABOUT');
    ab.discipline = gv('about-hdr-disc-tab2', ab.discipline || 'INTERACTIVE SPATIAL DESIGN');
    ab.description = gv('about-hdr-desc-tab2', ab.description || 'Background, education, capabilities and the experiences driving my practice.');

    // Profile card (All optional - only update if non-empty to avoid clearing Tab 01 data)
    if (!currentData.profile) currentData.profile = {};
    const p = currentData.profile;
    const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const tab2NameEl = document.getElementById('about-profile-name-tab2');
    if (tab2NameEl) p.name = tab2NameEl.value.trim();
    const tab2PhoneEl = document.getElementById('about-profile-phone-tab2');
    if (tab2PhoneEl) p.phone = tab2PhoneEl.value.trim();
    const tab2EmailEl = document.getElementById('about-profile-email-tab2');
    if (tab2EmailEl) p.email = tab2EmailEl.value.trim();
    const tab2BehanceEl = document.getElementById('about-profile-behance-tab2');
    if (tab2BehanceEl) p.behanceUrl = tab2BehanceEl.value.trim();
    const tab2LinktreeEl = document.getElementById('about-profile-linktree-tab2');
    if (tab2LinktreeEl) p.linktreeUrl = tab2LinktreeEl.value.trim();
    const tab2TagsEl = document.getElementById('about-profile-tags-tab2');
    if (tab2TagsEl) {
      p.tags = tab2TagsEl.value.split(',').map(s => s.trim()).filter(Boolean);
    }
    const tab2HeadlineEl = document.getElementById('about-profile-headline-tab2');
    if (tab2HeadlineEl) p.headline = tab2HeadlineEl.value.trim();
    const tab2BioEl = document.getElementById('about-profile-bio-tab2');
    if (tab2BioEl) p.shortBio = tab2BioEl.value.trim();
    const photoVal = getVal('about-photo-url-tab2');
    if (photoVal) p.photoUrl = photoVal;
    const tab2ResumeEl = document.getElementById('about-resume-url');
    if (tab2ResumeEl) p.resumeUrl = tab2ResumeEl.value.trim();
    const tab2ResumeTextEl = document.getElementById('about-resume-btn-text');
    if (tab2ResumeTextEl) p.resumeBtnText = tab2ResumeTextEl.value.trim();

    const chkProfileTab2 = document.getElementById('about-show-profile-card-tab2');
    if (chkProfileTab2) {
      if (!currentData.sectionVisibility) currentData.sectionVisibility = {};
      currentData.sectionVisibility.aboutProfileCard = chkProfileTab2.checked;
      p.showProfileCard = chkProfileTab2.checked;
      if (!currentData.about) currentData.about = {};
      currentData.about.showProfileCard = chkProfileTab2.checked;
      const idChk = document.getElementById('id-show-profile-card');
      if (idChk) idChk.checked = chkProfileTab2.checked;
    }
  }

  function collectAboutData() {
    collectAboutHeaderAndProfile();
    collectColumnTitles();
  }

  // Column Header Titles Editor
  function renderColumnTitlesEditor() {
    currentData.about.columnTitles = currentData.about.columnTitles || {
      education: "EDUCATION",
      software: "SOFTWARE",
      languages: "LANGUAGE",
      technical: "TECHNICAL",
      personal: "PERSONAL",
      experience: "EXPERIENCE",
      achievements: "ACHIEVEMENTS",
      competitions: "COMPETITIONS & EXTRACURRICULAR"
    };

    const map = {
      'col-title-education': 'education',
      'col-title-software': 'software',
      'col-title-languages': 'languages',
      'col-title-technical': 'technical',
      'col-title-personal': 'personal',
      'col-title-experience': 'experience',
      'col-title-achievements': 'achievements',
      'col-title-competitions': 'competitions'
    };

    Object.entries(map).forEach(([elId, key]) => {
      const inp = document.getElementById(elId);
      if (inp) {
        inp.value = currentData.about.columnTitles[key] || '';
        inp.oninput = () => {
          currentData.about.columnTitles[key] = inp.value;
          triggerRealtimeSync(120);
        };
      }
    });
  }

  function collectColumnTitles() {
    currentData.about.columnTitles = currentData.about.columnTitles || {};
    const map = {
      'col-title-education': 'education',
      'col-title-software': 'software',
      'col-title-languages': 'languages',
      'col-title-technical': 'technical',
      'col-title-personal': 'personal',
      'col-title-experience': 'experience',
      'col-title-achievements': 'achievements',
      'col-title-competitions': 'competitions'
    };

    Object.entries(map).forEach(([elId, key]) => {
      const inp = document.getElementById(elId);
      if (inp) {
        currentData.about.columnTitles[key] = inp.value.trim() || currentData.about.columnTitles[key] || key.toUpperCase();
      }
    });
  }

  // Stat Metric Counters (Auto-Calculates Projects & Competitions + Allows Adding New Metrics)
  // Stat Metric Counters (100% Manually Keyed In + Optional Section Toggle)
  function renderStatsEditor() {
    const container = document.getElementById('about-stats-editor-grid');
    if (!container) return;
    container.innerHTML = '';
    const stats = currentData.profile.stats || [
      { number: "6+", label: "YEARS STUDYING DESIGN" },
      { number: "2+", label: "PROJECTS COMPLETED" },
      { number: "10", label: "COMPETITIONS ENTERED" },
      { number: "7", label: "AWARDS & RECOGNITIONS" }
    ];

    // Optional Section Toggle (Include or Exclude Section on About Page)
    const toggleStats = document.getElementById('toggle-stats-visible');
    const toggleStatsText = document.getElementById('toggle-stats-text');
    const isStatsVisible = currentData.profile.showStats !== false;
    if (toggleStats) {
      toggleStats.checked = isStatsVisible;
      if (toggleStatsText) {
        toggleStatsText.textContent = isStatsVisible ? 'SECTION VISIBLE' : 'SECTION HIDDEN';
        toggleStatsText.style.color = isStatsVisible ? '#15803d' : '#b91c1c';
      }
      toggleStats.onchange = () => {
        currentData.profile.showStats = toggleStats.checked;
        if (toggleStatsText) {
          toggleStatsText.textContent = toggleStats.checked ? 'SECTION VISIBLE' : 'SECTION HIDDEN';
          toggleStatsText.style.color = toggleStats.checked ? '#15803d' : '#b91c1c';
        }
        container.style.opacity = toggleStats.checked ? '1' : '0.45';
        triggerRealtimeSync(0);
        showToast(`Stat counters section is now ${toggleStats.checked ? 'VISIBLE' : 'HIDDEN'} on About page!`);
      };
    }
    container.style.opacity = isStatsVisible ? '1' : '0.45';

    // Sync layout active state
    const currentLayout = currentData.profile.statsLayout || 'beside';
    const besideBtn = document.getElementById('stats-layout-beside-btn');
    const boxBtn = document.getElementById('stats-layout-box-btn');
    if (besideBtn && boxBtn) {
      if (currentLayout === 'box') {
        boxBtn.classList.add('active');
        besideBtn.classList.remove('active');
      } else {
        besideBtn.classList.add('active');
        boxBtn.classList.remove('active');
      }
    }

    stats.forEach((st, idx) => {
      const box = document.createElement('div');
      box.className = 'stat-card-editor';

      box.innerHTML = `
        <div class="stat-card-header">
          <span class="stat-card-badge">METRIC #0${idx + 1}</span>
          <button type="button" class="btn-del-row btn-del-stat" title="Delete Metric">&times;</button>
        </div>
        <div style="margin-top: 6px;">
          <label style="font-family: var(--font-mono); font-size: 0.65rem; color: #777; display: block; margin-bottom: 3px; font-weight: 700;">METRIC VALUE / NUMBER</label>
          <input type="text" class="editor-input stat-val-input" value="${st.number || ''}" placeholder="e.g. 6+, 2+, 10" />
        </div>
        <div style="margin-top: 8px;">
          <label style="font-family: var(--font-mono); font-size: 0.65rem; color: #777; display: block; margin-bottom: 3px; font-weight: 700;">LABEL / DESCRIPTION</label>
          <input type="text" class="editor-input stat-lbl-input" value="${st.label || ''}" placeholder="e.g. PROJECTS COMPLETED" />
        </div>
      `;

      const valInp = box.querySelector('.stat-val-input');
      const lblInp = box.querySelector('.stat-lbl-input');
      valInp.addEventListener('input', () => {
        stats[idx].number = valInp.value;
        triggerRealtimeSync(120);
      });
      lblInp.addEventListener('input', () => {
        stats[idx].label = lblInp.value;
        triggerRealtimeSync(120);
      });

      const delBtn = box.querySelector('.btn-del-stat');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          stats.splice(idx, 1);
          renderStatsEditor();
          triggerRealtimeSync(0);
        });
      }

      container.appendChild(box);
    });
    currentData.profile.stats = stats;
  }

  const btnAddStatMetric = document.getElementById('btn-add-stat-metric');
  if (btnAddStatMetric) {
    btnAddStatMetric.addEventListener('click', () => {
      currentData.profile.stats = currentData.profile.stats || [];
      currentData.profile.stats.push({ number: "1+", label: "NEW METRIC" });
      renderStatsEditor();
      triggerRealtimeSync(0);
    });
  }

  // Layout Pill Toggle Listeners
  const besideBtn = document.getElementById('stats-layout-beside-btn');
  const boxBtn = document.getElementById('stats-layout-box-btn');
  if (besideBtn && boxBtn) {
    besideBtn.addEventListener('click', () => {
      currentData.profile.statsLayout = 'beside';
      besideBtn.classList.add('active');
      boxBtn.classList.remove('active');
      triggerRealtimeSync(0);
    });
    boxBtn.addEventListener('click', () => {
      currentData.profile.statsLayout = 'box';
      boxBtn.classList.add('active');
      besideBtn.classList.remove('active');
      triggerRealtimeSync(0);
    });
  }

  /* ================= 4B. DYNAMIC ROW DRAG-TO-SWAP & ARROW REORDERING ================= */
  let activeDraggedState = { list: null, index: null, renderFn: null };

  function attachArrowControls(row, list, idx, renderFn) {
    const btnUp = row.querySelector('.btn-move-up');
    const btnDown = row.querySelector('.btn-move-down');

    if (btnUp && idx > 0) {
      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = list.splice(idx, 1)[0];
        list.splice(idx - 1, 0, item);
        renderFn();
        triggerRealtimeSync(0);
      });
    }

    if (btnDown && idx < list.length - 1) {
      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = list.splice(idx, 1)[0];
        list.splice(idx + 1, 0, item);
        renderFn();
        triggerRealtimeSync(0);
      });
    }
  }

  function enableRowDragAndDrop(row, list, idx, renderFn) {
    row.setAttribute('draggable', 'true');
    row.classList.add('draggable-row');

    row.addEventListener('dragstart', (e) => {
      // Don't drag if user is highlighting text inside an input or clicking an upload/delete button
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'LABEL'].includes(e.target.tagName)) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
      row.classList.add('is-dragging');
      activeDraggedState = { list, index: idx, renderFn };
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('is-dragging');
      document.querySelectorAll('.draggable-row').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom', 'is-dragging');
      });
      activeDraggedState = { list: null, index: null, renderFn: null };
    });

    row.addEventListener('dragover', (e) => {
      if (activeDraggedState.list !== list) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        row.classList.add('drag-over-top');
        row.classList.remove('drag-over-bottom');
      } else {
        row.classList.add('drag-over-bottom');
        row.classList.remove('drag-over-top');
      }
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    row.addEventListener('drop', (e) => {
      if (activeDraggedState.list !== list) return;
      e.preventDefault();
      row.classList.remove('drag-over-top', 'drag-over-bottom');
      const fromIdx = activeDraggedState.index;
      if (fromIdx === null || fromIdx === undefined || fromIdx === idx) return;

      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let targetIdx = idx;

      const [item] = list.splice(fromIdx, 1);
      if (fromIdx < idx && e.clientY < midY) {
        targetIdx = idx - 1;
      } else if (fromIdx > idx && e.clientY >= midY) {
        targetIdx = idx + 1;
      }
      list.splice(targetIdx, 0, item);

      renderFn();
      triggerRealtimeSync(0);
    });
  }

  // Education Timeline
  function renderEducationRows() {
    const wrap = document.getElementById('edu-rows-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    const eduList = currentData.about.education || [];
    eduList.forEach((e, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
        <div class="row-order-controls">
          <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${idx === eduList.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <input type="text" class="editor-input" style="width: 130px;" placeholder="Years (2023-2026)" value="${e.years || ''}" />
        <input type="text" class="editor-input" style="flex: 2;" placeholder="Institution / Degree Title" value="${e.title || ''}" />
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Subtitle / School" value="${e.subtitle || ''}" />
        <input type="text" class="editor-input" style="width: 110px;" placeholder="CGPA (3.79)" value="${e.cgpa || ''}" />
        <button type="button" class="btn-del-row" title="Delete Row">&times;</button>
      `;

      enableRowDragAndDrop(row, eduList, idx, renderEducationRows);
      attachArrowControls(row, eduList, idx, renderEducationRows);

      const inputs = row.querySelectorAll('.editor-input');
      inputs[0].addEventListener('input', ev => { e.years = ev.target.value; triggerRealtimeSync(120); });
      inputs[1].addEventListener('input', ev => { e.title = ev.target.value; triggerRealtimeSync(120); });
      inputs[2].addEventListener('input', ev => { e.subtitle = ev.target.value; triggerRealtimeSync(120); });
      inputs[3].addEventListener('input', ev => { e.cgpa = ev.target.value; triggerRealtimeSync(120); });
      row.querySelector('.btn-del-row').addEventListener('click', () => {
        eduList.splice(idx, 1);
        renderEducationRows();
        triggerRealtimeSync(0);
      });
      wrap.appendChild(row);
    });
  }

  const btnAddEdu = document.getElementById('btn-add-edu-row');
  if (btnAddEdu) {
    btnAddEdu.addEventListener('click', () => {
      currentData.about.education = currentData.about.education || [];
      currentData.about.education.push({ years: "2024-2026", title: "", subtitle: "", cgpa: "" });
      renderEducationRows();
      triggerRealtimeSync(0);
    });
  }

  // Software Proficiencies with Icon Upload (Base64) & Preview
  function renderSoftwareRows() {
    const wrap = document.getElementById('soft-rows-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    const softList = currentData.about.software || [];
    softList.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = 'software-row-item';
      const hasImg = !!(s.image && s.image.trim());
      row.innerHTML = `
        <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
        <div class="row-order-controls">
          <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${idx === softList.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <div class="software-icon-preview">
          ${hasImg ? `<img src="${s.image}" class="soft-preview-img" alt="${s.name || ''}" />` : `<span class="soft-preview-code">${s.code || '??'}</span>`}
        </div>
        <div class="software-row-inputs">
          <input type="text" class="editor-input soft-code-inp" style="width: 75px;" placeholder="Code (BL)" value="${s.code || ''}" />
          <input type="text" class="editor-input soft-name-inp" style="flex: 1; min-width: 140px;" placeholder="Software Name (Blender)" value="${s.name || ''}" />
          <input type="text" class="editor-input soft-url-inp" style="flex: 1.5; min-width: 160px;" placeholder="Icon URL or upload image file..." value="${hasImg && !s.image.startsWith('data:') ? s.image : (hasImg ? '[Uploaded File]' : '')}" />
          <label class="editor-btn-sm" style="cursor: pointer; margin: 0; white-space: nowrap;">
            Upload Icon
            <input type="file" accept="image/*" class="soft-file-inp" style="display: none;" />
          </label>
          ${hasImg ? `<button type="button" class="editor-btn-sm soft-clear-btn" title="Remove custom icon">Clear</button>` : ''}
        </div>
        <button type="button" class="btn-del-row" title="Delete Row">&times;</button>
      `;

      enableRowDragAndDrop(row, softList, idx, renderSoftwareRows);
      attachArrowControls(row, softList, idx, renderSoftwareRows);

      const codeInp = row.querySelector('.soft-code-inp');
      const nameInp = row.querySelector('.soft-name-inp');
      const urlInp = row.querySelector('.soft-url-inp');
      const fileInp = row.querySelector('.soft-file-inp');
      const clearBtn = row.querySelector('.soft-clear-btn');
      const prevBox = row.querySelector('.software-icon-preview');

      codeInp.addEventListener('input', ev => {
        s.code = ev.target.value.toUpperCase();
        if (!s.image) {
          prevBox.innerHTML = `<span class="soft-preview-code">${s.code || '??'}</span>`;
        }
        triggerRealtimeSync(120);
      });
      nameInp.addEventListener('input', ev => {
        s.name = ev.target.value;
        triggerRealtimeSync(120);
      });
      urlInp.addEventListener('input', ev => {
        s.image = ev.target.value.trim();
        if (s.image) {
          prevBox.innerHTML = `<img src="${s.image}" class="soft-preview-img" alt="${s.name || ''}" />`;
        } else {
          prevBox.innerHTML = `<span class="soft-preview-code">${s.code || '??'}</span>`;
        }
        triggerRealtimeSync(120);
      });

      fileInp.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const b64 = await fileToBase64(file, 200);
            s.image = b64;
            renderSoftwareRows();
            triggerRealtimeSync(0);
          } catch(err) {
            alert('Failed to process image file');
          }
        }
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          s.image = '';
          renderSoftwareRows();
          triggerRealtimeSync(0);
        });
      }

      row.querySelector('.btn-del-row').addEventListener('click', () => {
        softList.splice(idx, 1);
        renderSoftwareRows();
        triggerRealtimeSync(0);
      });
      wrap.appendChild(row);
    });
  }

  const btnAddSoft = document.getElementById('btn-add-soft-row');
  if (btnAddSoft) {
    btnAddSoft.addEventListener('click', () => {
      currentData.about.software = currentData.about.software || [];
      currentData.about.software.push({ code: "NEW", name: "New Tool", image: "" });
      renderSoftwareRows();
      triggerRealtimeSync(0);
    });
  }

  // Languages
  function renderLanguageRows() {
    const wrap = document.getElementById('lang-rows-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    const list = currentData.about.languages || [];
    list.forEach((l, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
        <div class="row-order-controls">
          <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Language (English)" value="${l.language || ''}" />
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Proficiency (NATIVE / FLUENT)" value="${l.proficiency || ''}" />
        <button type="button" class="btn-del-row" title="Delete Row">&times;</button>
      `;

      enableRowDragAndDrop(row, list, idx, renderLanguageRows);
      attachArrowControls(row, list, idx, renderLanguageRows);

      const inputs = row.querySelectorAll('.editor-input');
      inputs[0].addEventListener('input', ev => { l.language = ev.target.value; triggerRealtimeSync(120); });
      inputs[1].addEventListener('input', ev => { l.proficiency = ev.target.value.toUpperCase(); triggerRealtimeSync(120); });
      row.querySelector('.btn-del-row').addEventListener('click', () => {
        list.splice(idx, 1);
        renderLanguageRows();
        triggerRealtimeSync(0);
      });
      wrap.appendChild(row);
    });
  }

  const btnAddLang = document.getElementById('btn-add-lang-row');
  if (btnAddLang) {
    btnAddLang.addEventListener('click', () => {
      currentData.about.languages = currentData.about.languages || [];
      currentData.about.languages.push({ language: "", proficiency: "FLUENT" });
      renderLanguageRows();
      triggerRealtimeSync(0);
    });
  }

  // Skills Pills (Technical / Personal)
  function renderPillsEditor(key, containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = '';
    const skills = currentData.about[key] || [];
    skills.forEach((sk, idx) => {
      const pill = document.createElement('div');
      pill.className = 'cat-manage-pill';
      pill.innerHTML = `
        <span class="pill-title">${sk}</span>
        <button type="button" class="pill-del-btn" title="Remove">&times;</button>
      `;
      pill.querySelector('.pill-del-btn').addEventListener('click', () => {
        skills.splice(idx, 1);
        renderPillsEditor(key, containerId);
        triggerRealtimeSync(0);
      });
      wrap.appendChild(pill);
    });
  }

  const btnAddTech = document.getElementById('btn-add-tech-row');
  if (btnAddTech) {
    btnAddTech.addEventListener('click', () => {
      const val = prompt('Enter Technical Skill (e.g. 3D MODELING, PYTHON):');
      if (val && val.trim()) {
        currentData.about.technicalSkills = currentData.about.technicalSkills || [];
        currentData.about.technicalSkills.push(val.trim().toUpperCase());
        renderPillsEditor('technicalSkills', 'tech-skills-wrap');
        triggerRealtimeSync(0);
      }
    });
  }

  const btnAddPers = document.getElementById('btn-add-pers-row');
  if (btnAddPers) {
    btnAddPers.addEventListener('click', () => {
      const val = prompt('Enter Personal Skill (e.g. CRITICAL THINKING, LEADERSHIP):');
      if (val && val.trim()) {
        currentData.about.personalSkills = currentData.about.personalSkills || [];
        currentData.about.personalSkills.push(val.trim().toUpperCase());
        renderPillsEditor('personalSkills', 'pers-skills-wrap');
        triggerRealtimeSync(0);
      }
    });
  }

  // Industry Experience
  function renderExperienceRows() {
    const wrap = document.getElementById('exp-rows-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    const list = currentData.about.experience || [];
    list.forEach((e, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
        <div class="row-order-controls">
          <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <input type="text" class="editor-input" style="width: 120px;" placeholder="Type (INTERNSHIP)" value="${e.type || ''}" />
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Company Name" value="${e.company || ''}" />
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Role Title" value="${e.role || ''}" />
        <button type="button" class="btn-del-row" title="Delete">&times;</button>
      `;

      enableRowDragAndDrop(row, list, idx, renderExperienceRows);
      attachArrowControls(row, list, idx, renderExperienceRows);

      const inputs = row.querySelectorAll('.editor-input');
      inputs[0].addEventListener('input', ev => { e.type = ev.target.value.toUpperCase(); triggerRealtimeSync(120); });
      inputs[1].addEventListener('input', ev => { e.company = ev.target.value; triggerRealtimeSync(120); });
      inputs[2].addEventListener('input', ev => { e.role = ev.target.value; triggerRealtimeSync(120); });
      row.querySelector('.btn-del-row').addEventListener('click', () => {
        list.splice(idx, 1);
        renderExperienceRows();
        triggerRealtimeSync(0);
      });
      wrap.appendChild(row);
    });
  }

  const btnAddExp = document.getElementById('btn-add-exp-row');
  if (btnAddExp) {
    btnAddExp.addEventListener('click', () => {
      currentData.about.experience = currentData.about.experience || [];
      currentData.about.experience.push({ type: "INTERNSHIP", company: "", role: "", description: "" });
      renderExperienceRows();
      triggerRealtimeSync(0);
    });
  }

  // Achievements
  function renderAchievementRows() {
    const wrap = document.getElementById('ach-rows-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    const list = currentData.about.achievements || [];
    list.forEach((a, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
        <div class="row-order-controls">
          <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <input type="text" class="editor-input" style="flex: 2;" placeholder="Competition / Exhibition Title" value="${a.title || ''}" />
        <input type="text" class="editor-input" style="width: 130px;" placeholder="Award (FINALIST)" value="${a.award || ''}" />
        <button type="button" class="btn-del-row" title="Delete">&times;</button>
      `;

      enableRowDragAndDrop(row, list, idx, renderAchievementRows);
      attachArrowControls(row, list, idx, renderAchievementRows);

      const inputs = row.querySelectorAll('.editor-input');
      inputs[0].addEventListener('input', ev => { a.title = ev.target.value; triggerRealtimeSync(120); });
      inputs[1].addEventListener('input', ev => { a.award = ev.target.value.toUpperCase(); triggerRealtimeSync(120); });
      row.querySelector('.btn-del-row').addEventListener('click', () => {
        list.splice(idx, 1);
        renderAchievementRows();
        triggerRealtimeSync(0);
      });
      wrap.appendChild(row);
    });
  }

  const btnAddAch = document.getElementById('btn-add-ach-row');
  if (btnAddAch) {
    btnAddAch.addEventListener('click', () => {
      currentData.about.achievements = currentData.about.achievements || [];
      currentData.about.achievements.push({ title: "", award: "FINALIST" });
      renderAchievementRows();
      triggerRealtimeSync(0);
    });
  }

  // Competitions
  function renderCompetitionRows() {
    const wrap = document.getElementById('comp-rows-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    const list = currentData.about.competitions || [];
    list.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
        <div class="row-order-controls">
          <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <input type="text" class="editor-input" style="width: 90px;" placeholder="Year" value="${c.year || ''}" />
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Competition / Event Name" value="${c.name || ''}" />
        <button type="button" class="btn-del-row" title="Delete">&times;</button>
      `;

      enableRowDragAndDrop(row, list, idx, renderCompetitionRows);
      attachArrowControls(row, list, idx, renderCompetitionRows);
      const inputs = row.querySelectorAll('.editor-input');
      inputs[0].addEventListener('input', ev => { c.year = ev.target.value; triggerRealtimeSync(120); });
      inputs[1].addEventListener('input', ev => { c.name = ev.target.value; triggerRealtimeSync(120); });
      row.querySelector('.btn-del-row').addEventListener('click', () => {
        list.splice(idx, 1);
        renderCompetitionRows();
        triggerRealtimeSync(0);
      });
      wrap.appendChild(row);
    });
  }

  const btnAddComp = document.getElementById('btn-add-comp-row');
  if (btnAddComp) {
    btnAddComp.addEventListener('click', () => {
      currentData.about.competitions = currentData.about.competitions || [];
      currentData.about.competitions.push({ year: "2025", name: "" });
      renderCompetitionRows();
      triggerRealtimeSync(0);
    });
  }

  // Dynamic Custom About Sections (User can create new section and choose column 1 to 4 + style)
  function renderCustomAboutSections() {
    const stack = document.getElementById('custom-about-sections-stack');
    if (!stack) return;
    stack.innerHTML = '';
    currentData.about.customSections = currentData.about.customSections || [];

    if (currentData.about.customSections.length === 0) {
      stack.innerHTML = `<p class="mono-help" style="padding: 1rem 0;">No custom sections added yet. Click "+ ADD NEW SECTION" to create one.</p>`;
      return;
    }

    currentData.about.customSections.forEach((sec, sIdx) => {
      const box = document.createElement('div');
      box.className = 'custom-sec-box';
      const cStyle = sec.style || 'timeline';
      const colVal = sec.column !== undefined ? String(sec.column) : 'auto';

      box.innerHTML = `
        <div class="custom-sec-header">
          <div style="flex: 1; display:flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input type="text" class="editor-input sec-title-inp" value="${sec.title || ''}" placeholder="SECTION TITLE (e.g. WORKSHOPS)" style="font-weight:700; max-width: 260px;" />
            <select class="editor-select sec-col-sel" style="max-width: 280px;">
              <option value="auto" ${colVal === 'auto' ? 'selected' : ''}>⚡ Auto Flow Across Rows &amp; Columns</option>
              <option value="grid" ${colVal === 'grid' ? 'selected' : ''}>⚡ Full-Width Matrix Row (Spans 4 Columns)</option>
              <option value="1" ${colVal === '1' ? 'selected' : ''}>Column 1 (Technical Skills)</option>
              <option value="2" ${colVal === '2' ? 'selected' : ''}>Column 2 (Personal Skills)</option>
              <option value="3" ${colVal === '3' ? 'selected' : ''}>Column 3 (Experience / Awards)</option>
              <option value="4" ${colVal === '4' ? 'selected' : ''}>Column 4 (Competitions)</option>
            </select>
          </div>
          <div style="display:flex; gap: 6px; align-items: center;">
            ${sIdx > 0 ? `<button type="button" class="btn-move-sec btn-move-up" title="Move Up">&uarr;</button>` : ''}
            ${sIdx < currentData.about.customSections.length - 1 ? `<button type="button" class="btn-move-sec btn-move-down" title="Move Down">&darr;</button>` : ''}
            <button type="button" class="editor-btn-sm btn-add-custom-item">+ Add Item</button>
            <button type="button" class="editor-btn-danger btn-del-custom-sec">&times; Delete</button>
          </div>
        </div>

        <div class="sec-style-chooser-bar">
          <span class="style-chooser-label">DISPLAY STYLE:</span>
          <div class="sec-style-pills">
            <button type="button" class="sec-style-btn ${cStyle === 'timeline' ? 'active' : ''}" data-style="timeline">TIMELINE LIST</button>
            <button type="button" class="sec-style-btn ${cStyle === 'cards' ? 'active' : ''}" data-style="cards">EXPERIENCE CARDS</button>
            <button type="button" class="sec-style-btn ${cStyle === 'pills' ? 'active' : ''}" data-style="pills">TAG PILLS</button>
            <button type="button" class="sec-style-btn ${cStyle === 'awards' ? 'active' : ''}" data-style="awards">DISTINCTION LIST</button>
            <button type="button" class="sec-style-btn ${cStyle === 'narrative' ? 'active' : ''}" data-style="narrative">NARRATIVE BLOCK</button>
          </div>
        </div>

        <div class="custom-items-container editor-list-container"></div>
      `;

      const titleInp = box.querySelector('.sec-title-inp');
      titleInp.addEventListener('input', (e) => {
        sec.title = e.target.value.toUpperCase();
        triggerRealtimeSync(120);
      });

      const colSel = box.querySelector('.sec-col-sel');
      colSel.addEventListener('change', (e) => {
        const val = e.target.value;
        sec.column = (val === 'auto' || val === 'grid') ? val : parseInt(val, 10);
        triggerRealtimeSync(0);
      });

      // Style selector buttons
      const styleBtns = box.querySelectorAll('.sec-style-btn');
      styleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          styleBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          sec.style = btn.dataset.style;
          renderItems();
          triggerRealtimeSync(0);
        });
      });

      // Move Up
      const btnUp = box.querySelector('.btn-move-up');
      if (btnUp) {
        btnUp.addEventListener('click', () => {
          const item = currentData.about.customSections.splice(sIdx, 1)[0];
          currentData.about.customSections.splice(sIdx - 1, 0, item);
          renderCustomAboutSections();
          triggerRealtimeSync(0);
        });
      }

      // Move Down
      const btnDown = box.querySelector('.btn-move-down');
      if (btnDown) {
        btnDown.addEventListener('click', () => {
          const item = currentData.about.customSections.splice(sIdx, 1)[0];
          currentData.about.customSections.splice(sIdx + 1, 0, item);
          renderCustomAboutSections();
          triggerRealtimeSync(0);
        });
      }

      const itemsWrap = box.querySelector('.custom-items-container');
      sec.items = sec.items || [];

      function renderItems() {
        itemsWrap.innerHTML = '';
        const currentStyle = sec.style || 'timeline';

        sec.items.forEach((it, iIdx) => {
          const row = document.createElement('div');
          row.className = 'editor-dynamic-row';

          const reorderHtml = `
            <div class="row-drag-handle" title="Click & drag with mouse to swap order">⋮⋮</div>
            <div class="row-order-controls">
              <button type="button" class="btn-row-move btn-move-up" title="Move Up" ${iIdx === 0 ? 'disabled' : ''}>▲</button>
              <button type="button" class="btn-row-move btn-move-down" title="Move Down" ${iIdx === sec.items.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
          `;

          if (currentStyle === 'pills') {
            row.innerHTML = `
              ${reorderHtml}
              <input type="text" class="editor-input" style="flex: 1;" placeholder="Tag Name (e.g. PYTHON, SHADER GRAPH)" value="${it.title || it.subtitle || ''}" />
              <button type="button" class="btn-del-row" title="Delete Item">&times;</button>
            `;
            const inp = row.querySelector('.editor-input');
            inp.addEventListener('input', ev => {
              it.title = ev.target.value;
              it.subtitle = ev.target.value;
              triggerRealtimeSync(120);
            });
          } else if (currentStyle === 'awards') {
            row.innerHTML = `
              ${reorderHtml}
              <input type="text" class="editor-input" style="flex: 2;" placeholder="Award / Achievement Title" value="${it.title || ''}" />
              <input type="text" class="editor-input" style="flex: 1.5;" placeholder="Distinction / Org (e.g. EXCELLENCE AWARD)" value="${it.subtitle || ''}" />
              <button type="button" class="btn-del-row" title="Delete Item">&times;</button>
            `;
            const inps = row.querySelectorAll('.editor-input');
            inps[0].addEventListener('input', ev => { it.title = ev.target.value; triggerRealtimeSync(120); });
            inps[1].addEventListener('input', ev => { it.subtitle = ev.target.value; triggerRealtimeSync(120); });
          } else if (currentStyle === 'narrative') {
            row.innerHTML = `
              ${reorderHtml}
              <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                <input type="text" class="editor-input" placeholder="Topic Heading (optional)" value="${it.title || ''}" />
                <textarea class="editor-textarea" rows="2" placeholder="Narrative statement or description...">${it.description || it.subtitle || ''}</textarea>
              </div>
              <button type="button" class="btn-del-row" title="Delete Item">&times;</button>
            `;
            const inpTitle = row.querySelector('.editor-input');
            const inpDesc = row.querySelector('.editor-textarea');
            inpTitle.addEventListener('input', ev => { it.title = ev.target.value; triggerRealtimeSync(120); });
            inpDesc.addEventListener('input', ev => { it.description = ev.target.value; triggerRealtimeSync(120); });
          } else {
            // Default & Cards & Timeline
            row.innerHTML = `
              ${reorderHtml}
              <input type="text" class="editor-input" style="width: 110px;" placeholder="Year/Meta" value="${it.subtitle || ''}" />
              <input type="text" class="editor-input" style="flex: 2;" placeholder="Title / Role / Name" value="${it.title || ''}" />
              <input type="text" class="editor-input" style="flex: 2;" placeholder="Description / Note / Org" value="${it.description || ''}" />
              <button type="button" class="btn-del-row" title="Delete Item">&times;</button>
            `;
            const inps = row.querySelectorAll('.editor-input');
            inps[0].addEventListener('input', ev => { it.subtitle = ev.target.value; triggerRealtimeSync(120); });
            inps[1].addEventListener('input', ev => { it.title = ev.target.value; triggerRealtimeSync(120); });
            inps[2].addEventListener('input', ev => { it.description = ev.target.value; triggerRealtimeSync(120); });
          }

          enableRowDragAndDrop(row, sec.items, iIdx, renderItems);
          attachArrowControls(row, sec.items, iIdx, renderItems);

          row.querySelector('.btn-del-row').addEventListener('click', () => {
            sec.items.splice(iIdx, 1);
            renderItems();
            triggerRealtimeSync(0);
          });
          itemsWrap.appendChild(row);
        });
      }

      renderItems();

      box.querySelector('.btn-add-custom-item').addEventListener('click', () => {
        sec.items.push({ subtitle: "2025", title: "", description: "" });
        renderItems();
        triggerRealtimeSync(0);
      });

      box.querySelector('.btn-del-custom-sec').addEventListener('click', () => {
        if (confirm(`Delete section "${sec.title || 'Untitled'}"?`)) {
          currentData.about.customSections.splice(sIdx, 1);
          renderCustomAboutSections();
          triggerRealtimeSync(0);
        }
      });

      stack.appendChild(box);
    });
  }

  const btnAutoDistribute = document.getElementById('btn-auto-distribute-about-sections');
  if (btnAutoDistribute) {
    btnAutoDistribute.addEventListener('click', () => {
      currentData.about.customSections = currentData.about.customSections || [];
      currentData.about.customSections.forEach(cs => {
        cs.column = 'auto';
      });
      renderCustomAboutSections();
      triggerRealtimeSync(0);
      showToast('ALL CUSTOM SECTIONS SET TO AUTO-FLOW ACROSS ROWS');
    });
  }

  const btnAddCustomSec = document.getElementById('btn-add-custom-about-section');
  if (btnAddCustomSec) {
    btnAddCustomSec.addEventListener('click', () => {
      currentData.about.customSections = currentData.about.customSections || [];
      const newNum = currentData.about.customSections.length + 1;
      currentData.about.customSections.push({
        id: 'custom_sec_' + Date.now(),
        title: 'CUSTOM SECTION 0' + newNum,
        column: 'auto',
        style: 'timeline',
        items: [{ subtitle: '2025', title: 'Sample Entry', description: '' }]
      });
      renderCustomAboutSections();
      triggerRealtimeSync(0);
    });
  }

  const btnSaveAboutAll = document.getElementById('btn-save-about-all');
  if (btnSaveAboutAll) {
    btnSaveAboutAll.addEventListener('click', async () => {
      await executeSave('ALL ABOUT & RESUME DETAILS');
    });
  }

  /* ================= 5. TAB 03: PROJECT ARCHIVE ================= */
  // 5A. Main Categories Manager (e.g. COMPETITION, INTERNSHIP, ACADEMIC)
  function renderMainCategories() {
    const row = document.getElementById('main-categories-editor-row');
    if (!row) return;
    row.innerHTML = '';
    currentData.mainCategories = currentData.mainCategories || ['COMPETITION', 'INTERNSHIP', 'ACADEMIC'];

    currentData.mainCategories.forEach((cat, idx) => {
      const pill = document.createElement('div');
      pill.className = 'cat-manage-pill';
      pill.innerHTML = `
        <span class="pill-title">${cat}</span>
        <button type="button" class="pill-edit-btn" title="Rename Category">&#x270E;</button>
        <button type="button" class="pill-del-btn" title="Remove Category">&times;</button>
      `;
      pill.querySelector('.pill-edit-btn').addEventListener('click', async () => {
        const renamed = prompt(`Rename Category "${cat}":`, cat);
        if (renamed && renamed.trim() && renamed.trim().toUpperCase() !== cat) {
          const newName = renamed.trim().toUpperCase();
          // Update projects that use this category
          (currentData.projects || []).forEach(p => {
            if (p.mainSection === cat) p.mainSection = newName;
          });
          currentData.mainCategories[idx] = newName;
          renderMainCategories();
          renderProjectsGrid();
          await executeSave(`CATEGORY "${newName}" RENAMED`);
        }
      });
      pill.querySelector('.pill-del-btn').addEventListener('click', async () => {
        if (confirm(`Remove Main Category "${cat}"? Projects assigned to it will remain but may need reassigning.`)) {
          currentData.mainCategories.splice(idx, 1);
          renderMainCategories();
          renderProjectsGrid();
          await executeSave(`CATEGORY "${cat}" REMOVED`);
        }
      });
      row.appendChild(pill);
    });
  }

  const btnAddMainCat = document.getElementById('btn-add-main-category');
  if (btnAddMainCat) {
    btnAddMainCat.addEventListener('click', async () => {
      const name = prompt('Enter new Main Category name (e.g. FREELANCE, RESEARCH):');
      if (name && name.trim()) {
        const up = name.trim().toUpperCase();
        if (!currentData.mainCategories.includes(up)) {
          currentData.mainCategories.push(up);
          renderMainCategories();
          await executeSave(`CATEGORY "${up}" CREATED`);
        }
      }
    });
  }

  // 5B. Sub-Labels Catalog Manager (e.g. 3D, UI/UX, INSTALLATION, AR/VR)
  function renderSublabels() {
    const row = document.getElementById('sublabels-editor-row');
    if (!row) return;
    row.innerHTML = '';
    currentData.subLabelsList = currentData.subLabelsList || [
      '3D', 'UI/UX', 'INSTALLATION', 'AR / VR', 'GAME', 'PROJECTION', 'PRODUCT', 'ILLUSTRATION'
    ];

    currentData.subLabelsList.forEach((sub, idx) => {
      const pill = document.createElement('div');
      pill.className = 'cat-manage-pill';
      pill.innerHTML = `
        <span class="pill-title">${sub}</span>
        <button type="button" class="pill-edit-btn" title="Rename Sub-Label">&#x270E;</button>
        <button type="button" class="pill-del-btn" title="Remove Sub-Label">&times;</button>
      `;
      pill.querySelector('.pill-edit-btn').addEventListener('click', async () => {
        const renamed = prompt(`Rename Sub-label "${sub}":`, sub);
        if (renamed && renamed.trim() && renamed.trim().toUpperCase() !== sub) {
          const newName = renamed.trim().toUpperCase();
          (currentData.projects || []).forEach(p => {
            if (Array.isArray(p.subLabels)) {
              const sIdx = p.subLabels.indexOf(sub);
              if (sIdx !== -1) p.subLabels[sIdx] = newName;
            }
          });
          currentData.subLabelsList[idx] = newName;
          renderSublabels();
          renderProjectsGrid();
          await executeSave(`SUB-LABEL "${newName}" RENAMED`);
        }
      });
      pill.querySelector('.pill-del-btn').addEventListener('click', async () => {
        if (confirm(`Remove Sub-label "${sub}" from the catalog?`)) {
          currentData.subLabelsList.splice(idx, 1);
          renderSublabels();
          renderProjectsGrid();
          await executeSave(`SUB-LABEL "${sub}" REMOVED`);
        }
      });
      row.appendChild(pill);
    });
  }

  const btnAddSubLabel = document.getElementById('btn-add-sub-label');
  if (btnAddSubLabel) {
    btnAddSubLabel.addEventListener('click', async () => {
      const name = prompt('Enter new Sub-Label tag (e.g. MOTION DESIGN, FABRICATION):');
      if (name && name.trim()) {
        const up = name.trim().toUpperCase();
        if (!currentData.subLabelsList.includes(up)) {
          currentData.subLabelsList.push(up);
          renderSublabels();
          await executeSave(`SUB-LABEL "${up}" CREATED`);
        }
      }
    });
  }

  // 5C. Projects Cards Grid
  function renderProjectsGrid() {
    const grid = document.getElementById('admin-projects-cards-grid');
    const countEl = document.getElementById('admin-project-count');
    if (!grid) return;
    grid.innerHTML = '';
    const projects = currentData.projects || [];
    if (countEl) countEl.textContent = projects.length;

    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'editor-proj-card';
      const galFirst = p.gallery && p.gallery[0] ? (typeof p.gallery[0] === 'string' ? p.gallery[0] : (p.gallery[0].url || '')) : '';
      const sliceFirst = p.images && p.images[0] ? (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0].url || '')) : '';
      const thumbUrl = p.coverImage || sliceFirst || galFirst || '';
      const subLabelsText = (p.subLabels && p.subLabels.length > 0) ? p.subLabels.join(' • ') : (p.discipline || 'PROJECT');

      card.innerHTML = `
        <div class="proj-card-top">
          <div class="proj-card-thumb">
            ${thumbUrl ? `<img src="${thumbUrl}" alt="${p.title}" />` : ''}
          </div>
          <div class="proj-card-meta">
            <span class="proj-card-index">${p.index || '00'}</span>
            <h4 class="proj-card-title">${p.title || 'Untitled'}</h4>
            <span class="proj-card-main-sec">${p.mainSection || 'ACADEMIC'}</span>
            <div class="proj-card-sublabels">
              ${(p.subLabels || []).map(l => `<span class="proj-sublabel-tag">${l}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="proj-card-actions">
          <button type="button" class="editor-btn-sm btn-edit-proj" data-id="${p.id}">EDIT</button>
          <button type="button" class="editor-btn-sm btn-delete-proj" data-id="${p.id}">DELETE</button>
        </div>
      `;

      card.querySelector('.btn-edit-proj').addEventListener('click', () => {
        openProjectEditor(p.id);
      });

      card.querySelector('.btn-delete-proj').addEventListener('click', () => {
        openTripleConfirmDelete(p.id);
      });

      grid.appendChild(card);
    });
  }

  /* ================= 6. PROJECT EDITOR MODAL ================= */
  const projectModal = document.getElementById('project-edit-modal');
  const projectForm = document.getElementById('project-editor-form');
  const modalClose = document.getElementById('modal-project-close');
  const btnCancelProj = document.getElementById('btn-cancel-project');

  let activeProject = null;
  let activeSelectedSublabels = [];

  function openProjectEditor(projectId = null) {
    if (projectId) {
      activeProject = JSON.parse(JSON.stringify(currentData.projects.find(p => p.id === projectId)));
      document.getElementById('modal-project-heading').textContent = `EDIT PROJECT &bull; ${activeProject.title || ''}`;
    } else {
      activeProject = {
        id: 'p_' + Date.now(),
        index: String((currentData.projects.length + 1)).padStart(2, '0'),
        title: 'New Project',
        date: '2025',
        mainSection: currentData.mainCategories[0] || 'ACADEMIC',
        discipline: 'INSTALLATION',
        subLabels: ['3D'],
        shortDescription: '',
        fullDescription: '',
        videoUrl: '',
        hasGap: false,
        autoScrollImages: true,
        images: [],
        gallery: [],
        relatedLinks: [
          { title: "PROJECT DOCUMENTATION", url: "https://behance.net/reneemoo" }
        ],
        customSections: []
      };
      document.getElementById('modal-project-heading').textContent = 'CREATE NEW PROJECT';
    }

    if (activeProject) {
      activeProject.customSections = Array.isArray(activeProject.customSections) ? activeProject.customSections : [];
    }

    document.getElementById('edit-proj-id').value = activeProject.id;
    document.getElementById('edit-proj-title').value = activeProject.title || '';
    document.getElementById('edit-proj-date').value = activeProject.date || '';
    document.getElementById('edit-proj-index').value = activeProject.index || '';
    document.getElementById('edit-proj-short-desc').value = activeProject.shortDescription || '';
    document.getElementById('edit-proj-full-desc').value = activeProject.fullDescription || '';
    
    // Populate Search Keywords & Aliases
    const kwInput = document.getElementById('edit-proj-keywords');
    if (kwInput) {
      const combined = [
        ...(Array.isArray(activeProject.aliases) ? activeProject.aliases : []),
        ...(Array.isArray(activeProject.keywords) ? activeProject.keywords : [])
      ];
      const uniqueKw = Array.from(new Set(combined.map(k => (k || '').trim()))).filter(Boolean);
      kwInput.value = uniqueKw.join(', ');
    }

    document.getElementById('edit-proj-video').value = activeProject.videoUrl || '';
    document.getElementById('edit-proj-gap').value = activeProject.hasGap ? 'true' : 'false';
    document.getElementById('edit-proj-autoscroll').value = activeProject.autoScrollImages !== false ? 'true' : 'false';

    // Populate Main Category Select dropdown
    const mainSecSel = document.getElementById('edit-proj-main-section');
    mainSecSel.innerHTML = '';
    (currentData.mainCategories || []).forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (activeProject.mainSection === cat) opt.selected = true;
      mainSecSel.appendChild(opt);
    });

    // Populate Sub-Labels Selector
    if (Array.isArray(activeProject.subLabels) && activeProject.subLabels.length > 0) {
      activeSelectedSublabels = [...activeProject.subLabels];
    } else if (Array.isArray(activeProject.disciplines) && activeProject.disciplines.length > 0) {
      activeSelectedSublabels = [...activeProject.disciplines];
    } else if (activeProject.discipline) {
      activeSelectedSublabels = [activeProject.discipline];
    } else if (Array.isArray(activeProject.labels) && activeProject.labels.length > 0) {
      activeSelectedSublabels = [...activeProject.labels];
    } else {
      activeSelectedSublabels = [];
    }
    renderModalSublabels();

    // Related Links
    renderModalRelatedLinks();

    // Showcase Images (Continuous Roll)
    renderModalImages();

    // Gallery
    renderModalGallery();

    // Custom Project Sections (Lower Narrative, Images & Links)
    renderModalCustomSections();

    // Dedicated Cover Image
    const coverUrlInp = document.getElementById('edit-proj-cover-url');
    const coverPrevImg = document.getElementById('edit-proj-cover-preview');
    const coverPlaceholder = document.getElementById('cover-preview-placeholder');
    if (coverUrlInp) coverUrlInp.value = activeProject.coverImage || '';
    if (coverPrevImg && coverPlaceholder) {
      if (activeProject.coverImage) {
        coverPrevImg.src = activeProject.coverImage;
        coverPrevImg.style.display = 'block';
        coverPlaceholder.style.display = 'none';
      } else {
        coverPrevImg.src = '';
        coverPrevImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
      }
    }

    updateHoverPreview();

    projectModal.classList.add('open');
    try {
      projectModal.scrollTop = 0;
      const modalScrollArea = projectModal.querySelector('.editor-modal-body, .project-editor-modal-body, .modal-scroll-area, .editor-modal-container');
      if (modalScrollArea) modalScrollArea.scrollTop = 0;
    } catch(e) {}
  }

  function closeProjectEditor() {
    projectModal.classList.remove('open');
    activeProject = null;
  }

  function syncActiveProjectLive(shouldBroadcast = true) {
    if (!activeProject) return;
    const tEl = document.getElementById('edit-proj-title');
    if (tEl && tEl.value.trim()) activeProject.title = tEl.value.trim();
    const dEl = document.getElementById('edit-proj-date');
    if (dEl) activeProject.date = dEl.value.trim();
    const idxEl = document.getElementById('edit-proj-index');
    if (idxEl) activeProject.index = idxEl.value.trim();
    const covEl = document.getElementById('edit-proj-cover-url');
    if (covEl && covEl.value.trim()) activeProject.coverImage = covEl.value.trim();
    const mSecEl = document.getElementById('edit-proj-main-section');
    if (mSecEl && mSecEl.value) {
      activeProject.mainSection = mSecEl.value;
      activeProject.category = mSecEl.value.toLowerCase();
      activeProject.categories = [mSecEl.value.toLowerCase()];
    }
    activeProject.subLabels = activeSelectedSublabels.length > 0 ? [...activeSelectedSublabels] : [activeProject.discipline || 'PROJECT'];
    activeProject.discipline = activeProject.subLabels[0] || 'PROJECT';
    activeProject.disciplines = [...activeProject.subLabels];
    activeProject.labels = [...activeProject.subLabels];

    const sDescEl = document.getElementById('edit-proj-short-desc');
    if (sDescEl) activeProject.shortDescription = sDescEl.value.trim();
    const fDescEl = document.getElementById('edit-proj-full-desc');
    if (fDescEl) activeProject.fullDescription = fDescEl.value.trim();

    const kwEl = document.getElementById('edit-proj-keywords');
    if (kwEl) {
      const parsedKw = kwEl.value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      activeProject.keywords = parsedKw;
      activeProject.aliases = parsedKw.filter(s => s.length > 5);
    }

    const vidEl = document.getElementById('edit-proj-video');
    if (vidEl) {
      let vVal = vidEl.value.trim();
      if (vVal.includes('<iframe')) {
        const m = vVal.match(/src=["']([^"']+)["']/i);
        if (m && m[1]) vVal = m[1].trim();
      }
      activeProject.videoUrl = vVal;
    }
    const gapEl = document.getElementById('edit-proj-gap');
    if (gapEl) activeProject.hasGap = gapEl.value === 'true';
    const asEl = document.getElementById('edit-proj-autoscroll');
    if (asEl) activeProject.autoScrollImages = asEl.value === 'true';

    // 1. Scrape Related Links from modal DOM
    const linksWrap = document.getElementById('modal-related-links-container');
    if (linksWrap) {
      const scrapedLinks = [];
      linksWrap.querySelectorAll('.editor-dynamic-row').forEach(row => {
        const inps = row.querySelectorAll('.editor-input');
        if (inps && inps.length >= 2) {
          const lTitle = inps[0].value.trim().toUpperCase();
          const lUrl = inps[1].value.trim();
          if (lTitle || lUrl) {
            scrapedLinks.push({ title: lTitle || 'RELATED LINK', url: lUrl });
          }
        }
      });
      activeProject.relatedLinks = scrapedLinks;
    }

    // 2. Scrape Showcase Image Slices from modal DOM
    const imgsWrap = document.getElementById('modal-images-container');
    if (imgsWrap) {
      const scrapedImgs = [];
      imgsWrap.querySelectorAll('.editor-dynamic-row').forEach(row => {
        const inps = row.querySelectorAll('.editor-input');
        if (inps && inps.length >= 2) {
          const imgUrl = inps[0].value.trim();
          const imgCaption = inps[1].value.trim();
          if (imgUrl) {
            scrapedImgs.push({ url: imgUrl, caption: imgCaption });
          }
        }
      });
      activeProject.images = scrapedImgs;
    }

    // 3. Scrape Gallery from modal DOM
    const galWrap = document.getElementById('modal-gallery-container');
    if (galWrap) {
      const scrapedGal = [];
      // Support new rich gallery cards
      galWrap.querySelectorAll('.gal-item-card').forEach(card => {
        const urlInp = card.querySelector('.gal-url-input');
        const textInp = card.querySelector('.gal-text-input');
        const url = urlInp ? urlInp.value.trim() : '';
        const text = textInp ? textInp.value.trim() : '';
        if (url) {
          scrapedGal.push({ url, text });
        }
      });
      // Fallback for legacy rows if present
      if (scrapedGal.length === 0) {
        galWrap.querySelectorAll('.editor-dynamic-row').forEach(row => {
          const inp = row.querySelector('.editor-input');
          if (inp && inp.value.trim()) {
            scrapedGal.push({ url: inp.value.trim(), text: '' });
          }
        });
      }
      activeProject.gallery = scrapedGal;
    }

    // 4. Scrape Custom Project Sections from modal DOM
    const secContainer = document.getElementById('modal-project-custom-sections-container');
    if (secContainer) {
      const cards = secContainer.querySelectorAll('.custom-section-edit-card, .custom-sec-card');
      const scrapedSecs = [];
      cards.forEach((card, cIdx) => {
        const titleInp = card.querySelector('.sec-title-input');
        const textInp = card.querySelector('.sec-text-input');
        const imgUrlInp = card.querySelector('.sec-img-url-input');
        const captionInp = card.querySelector('.sec-img-caption-input');
        const linkTextInp = card.querySelector('.sec-link-text-input');
        const linkUrlInp = card.querySelector('.sec-link-url-input');
        const heightSelect = card.querySelector('.sec-height-select');
        const speedSelect = card.querySelector('.sec-speed-select');
        const activeLinkModeBtn = card.querySelector('.btn-link-mode-toggle.active');
        const activeTypePill = card.querySelector('.sec-type-pill.active');

        const title = titleInp ? titleInp.value.trim() : '';
        const text = textInp ? textInp.value.trim() : '';
        const imageUrl = imgUrlInp ? imgUrlInp.value.trim() : '';
        const imageCaption = captionInp ? captionInp.value.trim() : '';
        const linkText = linkTextInp ? linkTextInp.value.trim() : '';
        const linkUrl = linkUrlInp ? linkUrlInp.value.trim() : '';
        const embedHeight = heightSelect ? (parseInt(heightSelect.value, 10) || 620) : 620;
        const autoScrollSpeed = speedSelect ? (parseFloat(speedSelect.value) || 1) : 1;
        const linkMode = activeLinkModeBtn ? activeLinkModeBtn.dataset.mode : 'embed';
        const contentType = activeTypePill ? activeTypePill.dataset.type : 'mixed';

        const existingSec = (activeProject.customSections && activeProject.customSections[cIdx]) || {};
        const id = existingSec.id || `sec_${activeProject.id || 'p'}_${cIdx + 1}`;

        scrapedSecs.push({
          id,
          title: title || `SECTION 0${cIdx + 1}`,
          contentType,
          text,
          content: text,
          imageUrl,
          imageCaption,
          linkText,
          linkUrl,
          linkMode: linkMode === 'button_only' ? 'button_only' : 'embed',
          autoScroll: true,
          autoScrollSpeed,
          embedHeight
        });
      });
      activeProject.customSections = scrapedSecs;
    }

    // Synchronize to currentData.projects immediately!
    const existingIdx = currentData.projects.findIndex(p => p.id === activeProject.id);
    if (existingIdx !== -1) {
      currentData.projects[existingIdx] = activeProject;
    } else {
      currentData.projects.push(activeProject);
    }

    hasUnsavedChanges = true;
    updateSyncStatusUI();

    if (shouldBroadcast) {
      triggerRealtimeSync(120);
    }
  }

  if (modalClose) modalClose.addEventListener('click', closeProjectEditor);
  if (btnCancelProj) btnCancelProj.addEventListener('click', closeProjectEditor);

  // Project Cover Image Uploader Handlers
  const coverUrlInp = document.getElementById('edit-proj-cover-url');
  const coverFileInp = document.getElementById('edit-proj-cover-file');
  const coverPrevImg = document.getElementById('edit-proj-cover-preview');
  const coverPlaceholder = document.getElementById('cover-preview-placeholder');
  const btnClearCover = document.getElementById('btn-clear-cover-img');

  if (coverUrlInp) {
    coverUrlInp.addEventListener('input', () => {
      const url = coverUrlInp.value.trim();
      if (url && coverPrevImg && coverPlaceholder) {
        coverPrevImg.src = url;
        coverPrevImg.style.display = 'block';
        coverPlaceholder.style.display = 'none';
      } else if (coverPrevImg && coverPlaceholder) {
        coverPrevImg.src = '';
        coverPrevImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
      }
      if (activeProject) {
        activeProject.coverImage = url;
        syncActiveProjectLive();
      }
    });
  }

  if (coverFileInp) {
    coverFileInp.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        try {
          const b64 = await fileToBase64(file, 2560, 0.92);
          if (coverUrlInp) coverUrlInp.value = b64;
          if (coverPrevImg) {
            coverPrevImg.src = b64;
            coverPrevImg.style.display = 'block';
          }
          if (coverPlaceholder) coverPlaceholder.style.display = 'none';
          if (activeProject) {
            activeProject.coverImage = b64;
            syncActiveProjectLive();
          }
        } catch (err) {
          alert('Failed to read cover image file.');
        }
      }
    });
  }

  if (btnClearCover) {
    btnClearCover.addEventListener('click', () => {
      if (coverUrlInp) coverUrlInp.value = '';
      if (coverPrevImg) {
        coverPrevImg.src = '';
        coverPrevImg.style.display = 'none';
      }
      if (coverPlaceholder) coverPlaceholder.style.display = 'block';
      if (activeProject) {
        activeProject.coverImage = '';
        syncActiveProjectLive();
      }
    });
  }

  // Live Hover Preview
  function updateHoverPreview() {
    const idx = document.getElementById('edit-proj-index').value || '01';
    const title = document.getElementById('edit-proj-title').value || 'PROJECT TITLE';
    const subStr = activeSelectedSublabels.length > 0 ? activeSelectedSublabels.join(' • ') : 'PROJECT';
    const prevMeta = document.getElementById('preview-hover-meta');
    const prevTitle = document.getElementById('preview-hover-title');
    if (prevMeta) prevMeta.textContent = `${idx} — ${subStr}`;
    if (prevTitle) prevTitle.textContent = title.toUpperCase();
  }

  ['edit-proj-title', 'edit-proj-date', 'edit-proj-index', 'edit-proj-short-desc', 'edit-proj-full-desc', 'edit-proj-keywords', 'edit-proj-video'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updateHoverPreview();
        syncActiveProjectLive();
      });
    }
  });

  ['edit-proj-main-section', 'edit-proj-gap', 'edit-proj-autoscroll'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        syncActiveProjectLive();
      });
    }
  });

  // Sublabels selection inside project modal (Multi-Select)
  function renderModalSublabels() {
    const wrap = document.getElementById('modal-sublabels-selector');
    if (!wrap) return;
    wrap.innerHTML = '';
    
    // Merge all existing sub-labels with any active project custom sub-labels
    const allLabels = [...(currentData.subLabelsList || [])];
    activeSelectedSublabels.forEach(sub => {
      if (!allLabels.some(l => l.toUpperCase() === sub.toUpperCase())) {
        allLabels.push(sub);
      }
    });

    // Update count badge in modal header
    const badge = document.getElementById('sublabels-count-badge');
    if (badge) {
      badge.textContent = `${activeSelectedSublabels.length} SELECTED`;
      badge.style.background = activeSelectedSublabels.length > 0 ? '#112250' : '#8c8984';
      badge.style.color = '#DAD1CA';
    }

    allLabels.forEach(label => {
      const pill = document.createElement('button');
      pill.type = 'button';
      const isSelected = activeSelectedSublabels.some(l => l.toUpperCase() === label.toUpperCase());
      pill.className = `sublabel-toggle-pill ${isSelected ? 'selected' : ''}`;
      pill.textContent = (isSelected ? '✓ ' : '+ ') + label;
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isSelected) {
          activeSelectedSublabels = activeSelectedSublabels.filter(l => l.toUpperCase() !== label.toUpperCase());
        } else {
          activeSelectedSublabels.push(label);
        }
        renderModalSublabels();
        updateHoverPreview();
        syncActiveProjectLive();
      });
      wrap.appendChild(pill);
    });
  }

  const btnAddProjSub = document.getElementById('btn-add-project-sublabel');
  const inputNewProjSub = document.getElementById('input-new-project-sublabel');
  if (btnAddProjSub && inputNewProjSub) {
    inputNewProjSub.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnAddProjSub.click();
      }
    });

    btnAddProjSub.addEventListener('click', (e) => {
      e.preventDefault();
      const val = inputNewProjSub.value.trim().toUpperCase();
      if (val) {
        if (!currentData.subLabelsList.includes(val)) {
          currentData.subLabelsList.push(val);
          renderSublabels();
        }
        if (!activeSelectedSublabels.includes(val)) {
          activeSelectedSublabels.push(val);
        }
        inputNewProjSub.value = '';
        renderModalSublabels();
        updateHoverPreview();
        syncActiveProjectLive();
      }
    });
  }

  // Related Links inside project modal (Title AND URL editable)
  function renderModalRelatedLinks() {
    const wrap = document.getElementById('modal-related-links-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    activeProject.relatedLinks = activeProject.relatedLinks || [];

    activeProject.relatedLinks.forEach((link, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <input type="text" class="editor-input" style="flex: 1;" placeholder="Link Title (e.g. PROJECT DOCUMENTATION)" value="${link.title || ''}" />
        <input type="text" class="editor-input" style="flex: 2;" placeholder="Destination URL (https://...)" value="${link.url || ''}" />
        <button type="button" class="btn-del-row" title="Delete Link">&times;</button>
      `;
      const inps = row.querySelectorAll('.editor-input');
      inps[0].addEventListener('input', ev => { link.title = ev.target.value.toUpperCase(); syncActiveProjectLive(); });
      inps[1].addEventListener('input', ev => { link.url = ev.target.value; syncActiveProjectLive(); });
      row.querySelector('.btn-del-row').addEventListener('click', () => {
        activeProject.relatedLinks.splice(idx, 1);
        renderModalRelatedLinks();
        syncActiveProjectLive();
      });
      wrap.appendChild(row);
    });
  }

  const btnAddModalLink = document.getElementById('btn-add-modal-link');
  if (btnAddModalLink) {
    btnAddModalLink.addEventListener('click', () => {
      activeProject.relatedLinks = activeProject.relatedLinks || [];
      activeProject.relatedLinks.push({ title: "PROJECT DOCUMENTATION", url: "https://behance.net/reneemoo" });
      renderModalRelatedLinks();
      syncActiveProjectLive();
    });
  }

  // Showcase Images (Continuous Roll / Connected Slices)
  function renderModalImages() {
    const stream = document.getElementById('modal-images-container');
    if (!stream) return;
    stream.innerHTML = '';
    activeProject.images = activeProject.images || [];

    activeProject.images.forEach((img, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-dynamic-row';
      row.innerHTML = `
        <div class="slice-thumb-box" style="width: 50px; height: 50px; background:#e0ded8; overflow:hidden; flex-shrink:0; cursor:pointer; position:relative; border:1px solid #d5d2c8;" title="Click to browse image file">
          <img src="${img.url || ''}" style="width:100%;height:100%;object-fit:cover;${img.url ? '' : 'display:none;'}" />
          <span style="font-size:0.58rem; color:#888; font-family:var(--font-mono); text-align:center; position:absolute; inset:0; display:${img.url ? 'none' : 'flex'}; align-items:center; justify-content:center;">FILE</span>
          <input type="file" class="slice-row-file" accept="image/*" style="display:none;" />
        </div>
        <input type="text" class="editor-input slice-url-inp" style="flex: 2;" placeholder="Image URL or upload file..." value="${img.url || ''}" />
        <label class="editor-btn-xs" style="cursor:pointer; margin:0; padding:4px 8px; font-size:0.7rem; flex-shrink:0; display:inline-flex; align-items:center;">
          Upload
          <input type="file" class="slice-row-file-btn" accept="image/*" style="display:none;" />
        </label>
        <input type="text" class="editor-input slice-caption-inp" style="flex: 1.5;" placeholder="Optional Slice Caption" value="${img.caption || ''}" />
        <button type="button" class="btn-del-row" title="Remove Slice">&times;</button>
      `;

      const thumbBox = row.querySelector('.slice-thumb-box');
      const fileInp1 = row.querySelector('.slice-row-file');
      const fileInp2 = row.querySelector('.slice-row-file-btn');
      const urlInp = row.querySelector('.slice-url-inp');
      const captionInp = row.querySelector('.slice-caption-inp');
      const thumbImg = row.querySelector('img');
      const thumbSpan = row.querySelector('span');

      const handleSliceFile = async (file) => {
        if (!file) return;
        try {
          showToast('Optimizing slice image in high quality...');
          const b64 = await fileToBase64(file, 2560, 0.92);
          img.url = b64;
          urlInp.value = b64;
          thumbImg.src = b64;
          thumbImg.style.display = 'block';
          if (thumbSpan) thumbSpan.style.display = 'none';
          syncActiveProjectLive();
          showToast('Slice image updated!');
        } catch(e) {
          showToast('Failed to process image');
        }
      };

      if (thumbBox && fileInp1) {
        thumbBox.addEventListener('click', (e) => {
          if (e.target !== fileInp1) fileInp1.click();
        });
        fileInp1.addEventListener('change', (e) => handleSliceFile(e.target.files && e.target.files[0]));
      }
      if (fileInp2) {
        fileInp2.addEventListener('change', (e) => handleSliceFile(e.target.files && e.target.files[0]));
      }

      urlInp.addEventListener('input', ev => {
        img.url = ev.target.value.trim();
        if (img.url) {
          thumbImg.src = img.url;
          thumbImg.style.display = 'block';
          if (thumbSpan) thumbSpan.style.display = 'none';
        } else {
          thumbImg.style.display = 'none';
          if (thumbSpan) thumbSpan.style.display = 'flex';
        }
        syncActiveProjectLive();
      });

      captionInp.addEventListener('input', ev => {
        img.caption = ev.target.value;
        syncActiveProjectLive();
      });

      row.querySelector('.btn-del-row').addEventListener('click', () => {
        activeProject.images.splice(idx, 1);
        renderModalImages();
        syncActiveProjectLive();
      });

      stream.appendChild(row);
    });
  }

  const btnAddModalImg = document.getElementById('btn-add-modal-image');
  if (btnAddModalImg) {
    btnAddModalImg.addEventListener('click', () => {
      const url = prompt('Enter Image URL:');
      if (url && url.trim()) {
        activeProject.images = activeProject.images || [];
        activeProject.images.push({ url: url.trim(), caption: `Installation View 0${activeProject.images.length + 1}` });
        renderModalImages();
        syncActiveProjectLive();
      }
    });
  }

  // Batch Image Upload via Dropzone (Showcase Slices)
  const batchFileInput = document.getElementById('batch-file-input');
  const btnBatchBrowse = document.getElementById('btn-batch-browse');
  const modalDropzone = document.getElementById('modal-dropzone');

  if (btnBatchBrowse && batchFileInput) {
    btnBatchBrowse.addEventListener('click', () => batchFileInput.click());
  }
  if (modalDropzone && batchFileInput) {
    modalDropzone.addEventListener('click', (e) => {
      if (e.target !== btnBatchBrowse) batchFileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalDropzone.classList.add('drag-active');
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalDropzone.classList.remove('drag-active');
      }, false);
    });
    modalDropzone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        showToast(`Processing ${files.length} high-res image slice(s)...`);
        activeProject.images = activeProject.images || [];
        for (const file of files) {
          const b64 = await fileToBase64(file, 2560, 0.92);
          activeProject.images.push({ url: b64, caption: file.name.replace(/\.[^/.]+$/, '') });
        }
        renderModalImages();
        syncActiveProjectLive();
        showToast('High quality image slices loaded seamlessly!');
      }
    });
  }

  if (batchFileInput) {
    batchFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        showToast(`Processing ${files.length} high-res image slice(s)...`);
        for (const file of files) {
          const b64 = await fileToBase64(file, 2560, 0.92);
          activeProject.images = activeProject.images || [];
          activeProject.images.push({ url: b64, caption: file.name.replace(/\.[^/.]+$/, '') });
        }
        renderModalImages();
        syncActiveProjectLive();
        showToast('High quality image slices loaded seamlessly!');
      }
      batchFileInput.value = '';
    });
  }

  // Supplementary Gallery Images (Photo Gallery with Upload & Hover Text)
  function renderModalGallery() {
    const wrap = document.getElementById('modal-gallery-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    activeProject.gallery = Array.isArray(activeProject.gallery) ? activeProject.gallery : [];

    if (activeProject.gallery.length === 0) {
      wrap.innerHTML = `
        <div style="padding: 1.25rem; border: 1px dashed #d5d2c8; text-align: center; color: #888; font-family: var(--font-mono, monospace); font-size: 0.72rem; letter-spacing: 0.08em; background: #faf9f6;">
          NO GALLERY EXHIBITS ATTACHED YET. DRAG &amp; DROP PHOTOS ABOVE OR CLICK "+ UPLOAD PHOTO(S)".
        </div>
      `;
      return;
    }

    activeProject.gallery.forEach((rawItem, idx) => {
      const url = typeof rawItem === 'string' ? rawItem : (rawItem.url || '');
      const text = typeof rawItem === 'string' ? '' : (rawItem.text !== undefined ? rawItem.text : (rawItem.caption || ''));

      const safeUrl = (url || '').replace(/"/g, '&quot;');
      const safeText = (text || '').replace(/"/g, '&quot;');

      const card = document.createElement('div');
      card.className = 'gal-item-card';
      card.innerHTML = `
        <div class="gal-card-thumb-wrap" title="Click to replace image file">
          <img src="${safeUrl}" alt="Gallery Thumb" class="gal-thumb-img" onerror="this.style.opacity='0.25';" />
          <div class="gal-thumb-overlay">REPLACE<br/>PHOTO</div>
          <input type="file" class="gal-single-file-inp" accept="image/*" style="display:none;" />
        </div>

        <div class="gal-card-inputs">
          <div class="gal-row-line">
            <span class="gal-row-label">IMAGE URL:</span>
            <input type="text" class="editor-input gal-url-input" placeholder="Paste image URL (https://...)" value="${safeUrl}" style="flex:1; font-size:0.8rem; padding:5px 8px;" />
            <button type="button" class="editor-btn-xs btn-gal-upload-trigger" title="Upload local image file" style="padding:4px 8px; font-size:0.7rem; flex-shrink:0;">Upload</button>
          </div>
          <div class="gal-row-line">
            <span class="gal-row-label strong">HOVER TEXT:</span>
            <input type="text" class="editor-input gal-text-input" placeholder="Text displayed on hover / tap (e.g. Model detail, Material study)..." value="${safeText}" style="flex:1; font-size:0.82rem; padding:6px 8px; border-color:#000;" />
          </div>
        </div>

        <div class="gal-card-actions">
          <button type="button" class="btn-gal-move btn-gal-up" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.25;cursor:default;"' : ''}>&uarr;</button>
          <button type="button" class="btn-gal-move btn-gal-down" title="Move Down" ${idx === activeProject.gallery.length - 1 ? 'disabled style="opacity:0.25;cursor:default;"' : ''}>&darr;</button>
          <button type="button" class="btn-del-row" title="Delete Photo" style="font-size:1.3rem; margin-top:2px;">&times;</button>
        </div>
      `;

      const thumbWrap = card.querySelector('.gal-card-thumb-wrap');
      const thumbImg = card.querySelector('.gal-thumb-img');
      const fileInp = card.querySelector('.gal-single-file-inp');
      const urlInp = card.querySelector('.gal-url-input');
      const textInp = card.querySelector('.gal-text-input');
      const uploadTriggerBtn = card.querySelector('.btn-gal-upload-trigger');
      const btnUp = card.querySelector('.btn-gal-up');
      const btnDown = card.querySelector('.btn-gal-down');
      const btnDel = card.querySelector('.btn-del-row');

      // Click thumb or button -> open file dialog
      thumbWrap.addEventListener('click', (e) => {
        if (e.target !== fileInp) fileInp.click();
      });
      uploadTriggerBtn.addEventListener('click', () => fileInp.click());

      // File replace listener
      fileInp.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          try {
            showToast('Loading gallery photo in high quality...');
            const b64 = await fileToBase64(file, 1600, 0.86);
            const currentText = textInp.value.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            activeProject.gallery[idx] = {
              url: b64,
              text: currentText
            };
            urlInp.value = b64;
            thumbImg.src = b64;
            thumbImg.style.opacity = '1';
            textInp.value = currentText;
            syncActiveProjectLive();
            showToast('Gallery image updated!');
          } catch(err) {
            console.error('Failed to replace gallery photo:', err);
            showToast('Failed to load image file.');
          }
        }
      });

      // Inputs
      urlInp.addEventListener('input', () => {
        const newUrl = urlInp.value.trim();
        activeProject.gallery[idx] = {
          url: newUrl,
          text: textInp.value.trim()
        };
        thumbImg.src = newUrl;
        thumbImg.style.opacity = '1';
        syncActiveProjectLive();
      });

      textInp.addEventListener('input', () => {
        activeProject.gallery[idx] = {
          url: urlInp.value.trim(),
          text: textInp.value.trim()
        };
        syncActiveProjectLive();
      });

      // Reorder Up
      if (btnUp && idx > 0) {
        btnUp.addEventListener('click', () => {
          const temp = activeProject.gallery[idx];
          activeProject.gallery[idx] = activeProject.gallery[idx - 1];
          activeProject.gallery[idx - 1] = temp;
          renderModalGallery();
          syncActiveProjectLive();
        });
      }

      // Reorder Down
      if (btnDown && idx < activeProject.gallery.length - 1) {
        btnDown.addEventListener('click', () => {
          const temp = activeProject.gallery[idx];
          activeProject.gallery[idx] = activeProject.gallery[idx + 1];
          activeProject.gallery[idx + 1] = temp;
          renderModalGallery();
          syncActiveProjectLive();
        });
      }

      // Delete
      btnDel.addEventListener('click', () => {
        activeProject.gallery.splice(idx, 1);
        renderModalGallery();
        syncActiveProjectLive();
      });

      wrap.appendChild(card);
    });
  }

  // Batch Gallery Upload via Dropzone & Browse Button
  const galleryFileInput = document.getElementById('gallery-file-input');
  const btnBrowseGalleryFiles = document.getElementById('btn-browse-gallery-files');
  const btnGalleryBrowseAlt = document.getElementById('btn-gallery-browse-alt');
  const modalGalleryDropzone = document.getElementById('modal-gallery-dropzone');

  if (btnBrowseGalleryFiles && galleryFileInput) {
    btnBrowseGalleryFiles.addEventListener('click', () => galleryFileInput.click());
  }
  if (btnGalleryBrowseAlt && galleryFileInput) {
    btnGalleryBrowseAlt.addEventListener('click', () => galleryFileInput.click());
  }
  if (modalGalleryDropzone && galleryFileInput) {
    modalGalleryDropzone.addEventListener('click', (e) => {
      if (e.target !== btnGalleryBrowseAlt) galleryFileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      modalGalleryDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalGalleryDropzone.classList.add('drag-active');
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      modalGalleryDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalGalleryDropzone.classList.remove('drag-active');
      }, false);
    });
    modalGalleryDropzone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        await processGalleryBatchFiles(files);
      }
    });
  }

  if (galleryFileInput) {
    galleryFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        await processGalleryBatchFiles(files);
      }
      galleryFileInput.value = '';
    });
  }

  async function processGalleryBatchFiles(files) {
    showToast(`Processing ${files.length} gallery photo(s)...`);
    activeProject.gallery = Array.isArray(activeProject.gallery) ? activeProject.gallery : [];
    for (const file of files) {
      try {
        const b64 = await fileToBase64(file, 1600, 0.86);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        activeProject.gallery.push({
          url: b64,
          text: cleanName
        });
      } catch(err) {
        console.error('Failed to process gallery file:', err);
      }
    }
    renderModalGallery();
    syncActiveProjectLive();
    showToast(`Added ${files.length} gallery exhibit(s)!`);
  }

  const btnAddModalGallery = document.getElementById('btn-add-modal-gallery');
  if (btnAddModalGallery) {
    btnAddModalGallery.addEventListener('click', () => {
      const url = prompt('Enter Gallery Image URL:');
      if (url && url.trim()) {
        const hoverText = prompt('Optional Hover Text / Caption (or leave blank):', '') || '';
        activeProject.gallery = Array.isArray(activeProject.gallery) ? activeProject.gallery : [];
        activeProject.gallery.push({
          url: url.trim(),
          text: hoverText.trim()
        });
        renderModalGallery();
        syncActiveProjectLive();
      }
    });
  }

  // Custom Project Sections (Lower Page Narrative, Images & Links)
  function renderModalCustomSections() {
    const container = document.getElementById('modal-project-custom-sections-container');
    if (!container) return;
    container.innerHTML = '';
    activeProject.customSections = Array.isArray(activeProject.customSections) ? activeProject.customSections : [];

    if (activeProject.customSections.length === 0) {
      container.innerHTML = `
        <div class="empty-state-hint" style="padding: 1.5rem; border: 1px dashed #d5d2c8; text-align: center; color: #777; font-family: var(--font-mono, monospace); font-size: 0.72rem; letter-spacing: 0.08em;">
          NO CUSTOM SECTIONS ADDED YET. CLICK "+ ADD SECTION" ABOVE TO CREATE ONE.
        </div>
      `;
      return;
    }

    activeProject.customSections.forEach((sec, idx) => {
      const card = document.createElement('div');
      card.className = 'custom-section-edit-card custom-sec-card';
      const cType = sec.contentType || 'mixed';

      card.innerHTML = `
        <div class="custom-section-card-header">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="custom-sec-badge">SECTION #0${idx + 1}</span>
            <div class="custom-sec-type-pills">
              <button type="button" class="sec-type-pill ${cType === 'mixed' ? 'active' : ''}" data-type="mixed">MIXED (ALL)</button>
              <button type="button" class="sec-type-pill ${cType === 'text' ? 'active' : ''}" data-type="text">TEXT ONLY</button>
              <button type="button" class="sec-type-pill ${cType === 'image' ? 'active' : ''}" data-type="image">IMAGE ONLY</button>
              <button type="button" class="sec-type-pill ${cType === 'link' ? 'active' : ''}" data-type="link">LINK ONLY</button>
            </div>
          </div>
          <div class="custom-sec-actions">
            ${idx > 0 ? `<button type="button" class="btn-move-sec btn-move-up" title="Move Up">&uarr;</button>` : ''}
            ${idx < activeProject.customSections.length - 1 ? `<button type="button" class="btn-move-sec btn-move-down" title="Move Down">&darr;</button>` : ''}
            <button type="button" class="btn-del-row btn-del-sec" title="Delete Section">&times;</button>
          </div>
        </div>

        <!-- Section Title (Name it) -->
        <div class="editor-field">
          <label style="font-size: 0.68rem; font-weight: 700; color: #555;">SECTION TITLE / NAME</label>
          <input type="text" class="editor-input sec-title-input" placeholder="e.g. RESEARCH METHODOLOGY, SITE ANALYSIS, BLUEPRINTS, CREDITS..." value="${sec.title || ''}" />
        </div>

        <!-- Text Content Area -->
        <div class="editor-field sec-field-text" style="${cType === 'image' || cType === 'link' ? 'display:none;' : ''}">
          <label style="font-size: 0.68rem; font-weight: 700; color: #555;">TEXT / DESCRIPTION CONTENT</label>
          <textarea class="editor-textarea sec-text-input" rows="3" placeholder="Enter paragraph narrative, concept notes, technical overview...">${sec.text || sec.content || ''}</textarea>
        </div>

        <!-- Image Content Area -->
        <div class="editor-field sec-field-image" style="${cType === 'text' || cType === 'link' ? 'display:none;' : ''}">
          <label style="font-size: 0.68rem; font-weight: 700; color: #555;">SECTION IMAGE (DIRECT FILE UPLOAD OR URL)</label>
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="width: 80px; height: 80px; background:#e9e7e1; border:1px solid #d5d2c8; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
              <img class="sec-img-preview" src="${sec.imageUrl || ''}" style="${sec.imageUrl ? 'width:100%;height:100%;object-fit:cover;' : 'display:none;'}" alt="Preview" />
              <span class="sec-img-placeholder" style="${sec.imageUrl ? 'display:none;' : 'font-size:0.6rem; color:#888; font-family:var(--font-mono, monospace); text-align:center; padding:4px;'}">NO IMAGE</span>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
              <input type="text" class="editor-input sec-img-url-input" placeholder="Paste image URL (https://...)" value="${sec.imageUrl || ''}" />
              <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <label class="editor-btn-outline dark-btn" style="cursor:pointer; margin:0; padding:4px 10px; font-size:0.68rem; display:inline-flex; align-items:center;">
                  Browse Image File...
                  <input type="file" class="sec-img-file-input" accept="image/*" style="display:none;" />
                </label>
                <button type="button" class="editor-btn-sm btn-clear-sec-img" style="padding:4px 10px; font-size:0.68rem;">Clear Image</button>
              </div>
              <input type="text" class="editor-input sec-img-caption-input" placeholder="Optional Image Caption (e.g. Figure 01: Spatial Matrix)" value="${sec.imageCaption || ''}" />
            </div>
          </div>
        </div>

        <!-- Link & Research Document Content Area -->
        <div class="editor-field sec-field-link" style="${cType === 'text' || cType === 'image' ? 'display:none;' : ''}">
          <label style="font-size: 0.68rem; font-weight: 700; color: #555;">RESEARCH DOCUMENT & LINK PRESENTATION MODE</label>
          
          <div class="sec-link-mode-bar" style="display:flex; gap:8px; margin: 6px 0 10px 0; flex-wrap:wrap;">
            <button type="button" class="btn-link-mode-toggle ${sec.linkMode !== 'button_only' ? 'active' : ''}" data-mode="embed" style="padding:6px 12px; font-size:0.68rem; font-weight:700; font-family:var(--font-mono, monospace); cursor:pointer; border:1px solid #d5d2c8; background:${sec.linkMode !== 'button_only' ? '#111' : '#fff'}; color:${sec.linkMode !== 'button_only' ? '#fff' : '#444'};">
              📄 EMBEDDED PDF PROCESS VIEWER (In-Page Document Viewer)
            </button>
            <button type="button" class="btn-link-mode-toggle ${sec.linkMode === 'button_only' ? 'active' : ''}" data-mode="button_only" style="padding:6px 12px; font-size:0.68rem; font-weight:700; font-family:var(--font-mono, monospace); cursor:pointer; border:1px solid #d5d2c8; background:${sec.linkMode === 'button_only' ? '#111' : '#fff'}; color:${sec.linkMode === 'button_only' ? '#fff' : '#444'};">
              🔗 DIRECT LINK BUTTON (Open in new tab &bull; Scroll yourself)
            </button>
          </div>

          <div class="form-row-2">
            <div>
              <label style="font-size: 0.62rem; color: #777;">LINK / DOCUMENT TITLE</label>
              <input type="text" class="editor-input sec-link-text-input" placeholder="e.g. VIEW RESEARCH PROCESS & WHITE PAPER" value="${sec.linkText || ''}" />
            </div>
            <div>
              <label style="font-size: 0.62rem; color: #777;">DOCUMENT / PDF URL (Google Drive, direct .pdf link, Canva, etc.)</label>
              <input type="text" class="editor-input sec-link-url-input" placeholder="https://... or Google Drive link" value="${sec.linkUrl || ''}" />
            </div>
          </div>

          <!-- Embedded PDF Viewer Configuration Box -->
          <div class="sec-embed-panel" style="${sec.linkMode !== 'button_only' ? 'display:block; margin-top:10px; padding:10px 12px; background:#f4f2ec; border:1px solid #d5d2c8;' : 'display:none;'}">
            <div style="font-size:0.68rem; font-weight:700; color:#222; margin-bottom:6px; letter-spacing:0.04em;">EMBEDDED PROCESS VIEWER OPTIONS</div>
            <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; font-size:0.75rem;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.68rem; color:#555;">Viewer Height:</span>
                <select class="editor-input sec-height-select" style="padding:2px 8px; font-size:0.72rem; width:auto;">
                  <option value="500" ${sec.embedHeight == 500 ? 'selected' : ''}>Compact (500px)</option>
                  <option value="620" ${(!sec.embedHeight || sec.embedHeight == 620) ? 'selected' : ''}>Standard (620px)</option>
                  <option value="780" ${sec.embedHeight == 780 ? 'selected' : ''}>Tall / Full Page (780px)</option>
                  <option value="920" ${sec.embedHeight == 920 ? 'selected' : ''}>Extended (920px)</option>
                </select>
              </div>
            </div>
            <div style="font-size:0.64rem; color:#666; font-style:italic; margin-top:6px;">
              💡 Paste any Google Drive link, direct PDF file URL, Canva presentation, or Figma prototype to embed and view directly inside the page.
            </div>
          </div>
        </div>
      `;

      // Wire inputs
      const titleInp = card.querySelector('.sec-title-input');
      const textInp = card.querySelector('.sec-text-input');
      const imgUrlInp = card.querySelector('.sec-img-url-input');
      const imgFileInp = card.querySelector('.sec-img-file-input');
      const imgPrev = card.querySelector('.sec-img-preview');
      const imgPlaceholder = card.querySelector('.sec-img-placeholder');
      const btnClearImg = card.querySelector('.btn-clear-sec-img');
      const captionInp = card.querySelector('.sec-img-caption-input');
      const linkTextInp = card.querySelector('.sec-link-text-input');
      const linkUrlInp = card.querySelector('.sec-link-url-input');
      const linkModeButtons = card.querySelectorAll('.btn-link-mode-toggle');
      const embedPanel = card.querySelector('.sec-embed-panel');
      const heightSelect = card.querySelector('.sec-height-select');
      const speedSelect = card.querySelector('.sec-speed-select');

      linkModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          sec.linkMode = mode;
          linkModeButtons.forEach(b => {
            const isActive = b.dataset.mode === mode;
            b.classList.toggle('active', isActive);
            b.style.background = isActive ? '#111' : '#fff';
            b.style.color = isActive ? '#fff' : '#444';
          });
          if (embedPanel) {
            embedPanel.style.display = mode === 'embed' ? 'block' : 'none';
          }
          syncActiveProjectLive();
        });
      });

      if (heightSelect) {
        heightSelect.addEventListener('change', () => {
          sec.embedHeight = parseInt(heightSelect.value, 10) || 620;
          syncActiveProjectLive();
        });
      }

      titleInp.addEventListener('input', () => { sec.title = titleInp.value; syncActiveProjectLive(); });
      textInp.addEventListener('input', () => { sec.text = textInp.value; sec.content = textInp.value; syncActiveProjectLive(); });
      imgUrlInp.addEventListener('input', () => {
        sec.imageUrl = imgUrlInp.value.trim();
        if (sec.imageUrl) {
          imgPrev.src = sec.imageUrl;
          imgPrev.style.display = 'block';
          imgPlaceholder.style.display = 'none';
        } else {
          imgPrev.src = '';
          imgPrev.style.display = 'none';
          imgPlaceholder.style.display = 'block';
        }
        syncActiveProjectLive();
      });

      if (imgFileInp) {
        imgFileInp.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            try {
              const b64 = await fileToBase64(file, 2560, 0.92);
              sec.imageUrl = b64;
              imgUrlInp.value = b64;
              imgPrev.src = b64;
              imgPrev.style.display = 'block';
              imgPlaceholder.style.display = 'none';
              syncActiveProjectLive();
            } catch (err) {
              alert('Error reading image file');
            }
          }
        });
      }

      if (btnClearImg) {
        btnClearImg.addEventListener('click', () => {
          sec.imageUrl = '';
          imgUrlInp.value = '';
          imgPrev.src = '';
          imgPrev.style.display = 'none';
          imgPlaceholder.style.display = 'block';
          syncActiveProjectLive();
        });
      }

      captionInp.addEventListener('input', () => { sec.imageCaption = captionInp.value; syncActiveProjectLive(); });
      linkTextInp.addEventListener('input', () => { sec.linkText = linkTextInp.value; syncActiveProjectLive(); });
      linkUrlInp.addEventListener('input', () => { sec.linkUrl = linkUrlInp.value; syncActiveProjectLive(); });

      // Type Pills
      const pills = card.querySelectorAll('.sec-type-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          const type = pill.dataset.type;
          sec.contentType = type;
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');

          const fText = card.querySelector('.sec-field-text');
          const fImg = card.querySelector('.sec-field-image');
          const fLink = card.querySelector('.sec-field-link');

          if (type === 'mixed') {
            fText.style.display = 'block';
            fImg.style.display = 'block';
            fLink.style.display = 'block';
          } else if (type === 'text') {
            fText.style.display = 'block';
            fImg.style.display = 'none';
            fLink.style.display = 'none';
          } else if (type === 'image') {
            fText.style.display = 'none';
            fImg.style.display = 'block';
            fLink.style.display = 'none';
          } else if (type === 'link') {
            fText.style.display = 'none';
            fImg.style.display = 'none';
            fLink.style.display = 'block';
          }
          syncActiveProjectLive();
        });
      });

      // Move Up
      const btnUp = card.querySelector('.btn-move-up');
      if (btnUp) {
        btnUp.addEventListener('click', () => {
          const item = activeProject.customSections.splice(idx, 1)[0];
          activeProject.customSections.splice(idx - 1, 0, item);
          renderModalCustomSections();
          syncActiveProjectLive();
        });
      }

      // Move Down
      const btnDown = card.querySelector('.btn-move-down');
      if (btnDown) {
        btnDown.addEventListener('click', () => {
          const item = activeProject.customSections.splice(idx, 1)[0];
          activeProject.customSections.splice(idx + 1, 0, item);
          renderModalCustomSections();
          syncActiveProjectLive();
        });
      }

      // Delete
      card.querySelector('.btn-del-sec').addEventListener('click', () => {
        if (confirm(`Delete section "${sec.title || 'Untitled'}"?`)) {
          activeProject.customSections.splice(idx, 1);
          renderModalCustomSections();
          syncActiveProjectLive();
        }
      });

      container.appendChild(card);
    });
  }

  const btnAddProjectCustomSec = document.getElementById('btn-add-project-custom-section');
  if (btnAddProjectCustomSec) {
    btnAddProjectCustomSec.addEventListener('click', () => {
      activeProject.customSections = Array.isArray(activeProject.customSections) ? activeProject.customSections : [];
      activeProject.customSections.push({
        id: 'sec_' + Date.now(),
        title: 'NEW SECTION',
        contentType: 'mixed',
        text: '',
        imageUrl: '',
        imageCaption: '',
        linkText: '',
        linkUrl: '',
        linkMode: 'embed',
        autoScroll: true,
        autoScrollSpeed: 1,
        embedHeight: 620
      });
      renderModalCustomSections();
      syncActiveProjectLive();
    });
  }

  // Save Project Form
  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = projectForm.querySelector('button[type="submit"]');
      const originalText = saveBtn ? saveBtn.textContent : 'SAVE PROJECT';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'SAVING...';
      }
      try {
        syncActiveProjectLive();
        const titleToSave = (activeProject && activeProject.title) || 'PROJECT';
        closeProjectEditor();
        renderProjectsGrid();
        await executeSave(`PROJECT "${titleToSave}"`);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }
      }
    });
  }

  const btnCreateProj = document.getElementById('btn-create-project');
  if (btnCreateProj) {
    btnCreateProj.addEventListener('click', () => openProjectEditor(null));
  }

  /* ================= 7. TRIPLE-CONFIRM PROJECT DELETE ================= */
  const deleteModal = document.getElementById('delete-confirm-modal');
  const delModalClose = document.getElementById('delete-modal-close');
  const delCancelBtns = document.querySelectorAll('.btn-del-cancel');
  const btnDelProceed1 = document.getElementById('btn-del-proceed-1');
  const btnDelProceed2 = document.getElementById('btn-del-proceed-2');
  const btnDelFinalConfirm = document.getElementById('btn-del-final-confirm');
  const inputDelVerify = document.getElementById('input-del-verification');

  let pendingDeleteProj = null;

  function openTripleConfirmDelete(projId) {
    pendingDeleteProj = currentData.projects.find(p => p.id === projId);
    if (!pendingDeleteProj) return;

    const title = pendingDeleteProj.title || 'Untitled Project';
    document.getElementById('del-name-step-1').textContent = `"${title}"`;
    document.getElementById('del-name-step-2').textContent = `"${title}"`;
    document.getElementById('del-name-step-3').textContent = `"${title}"`;

    // Reset to step 1
    document.getElementById('delete-step-1').style.display = 'block';
    document.getElementById('delete-step-2').style.display = 'none';
    document.getElementById('delete-step-3').style.display = 'none';

    if (inputDelVerify) {
      inputDelVerify.value = '';
    }
    if (btnDelFinalConfirm) {
      btnDelFinalConfirm.disabled = true;
      btnDelFinalConfirm.classList.add('disabled');
    }

    deleteModal.classList.add('open');
  }

  function closeDeleteModal() {
    deleteModal.classList.remove('open');
    pendingDeleteProj = null;
  }

  if (delModalClose) delModalClose.addEventListener('click', closeDeleteModal);
  delCancelBtns.forEach(btn => btn.addEventListener('click', closeDeleteModal));

  // Step 1 -> Step 2
  if (btnDelProceed1) {
    btnDelProceed1.addEventListener('click', () => {
      document.getElementById('delete-step-1').style.display = 'none';
      document.getElementById('delete-step-2').style.display = 'block';
    });
  }

  // Step 2 -> Step 3
  if (btnDelProceed2) {
    btnDelProceed2.addEventListener('click', () => {
      document.getElementById('delete-step-2').style.display = 'none';
      document.getElementById('delete-step-3').style.display = 'block';
      if (inputDelVerify) {
        inputDelVerify.value = '';
        setTimeout(() => inputDelVerify.focus(), 80);
      }
    });
  }

  // Step 3 verification check: User must type "DELETE"
  if (inputDelVerify) {
    inputDelVerify.addEventListener('input', () => {
      const typed = inputDelVerify.value.trim().toUpperCase();
      const isMatch = typed === 'DELETE';
      btnDelFinalConfirm.disabled = !isMatch;
      btnDelFinalConfirm.classList.toggle('disabled', !isMatch);
    });
  }

  // Step 3 Final Confirm
  if (btnDelFinalConfirm) {
    btnDelFinalConfirm.addEventListener('click', async () => {
      if (!pendingDeleteProj) return;
      const title = pendingDeleteProj.title;
      currentData.projects = currentData.projects.filter(p => p.id !== pendingDeleteProj.id);
      closeDeleteModal();
      renderProjectsGrid();
      await executeSave(`PROJECT "${title}" DELETED`);
    });
  }

  // Tab 03 Bottom Save Button
  const btnSaveProjectsAll = document.getElementById('btn-save-projects-all');
  if (btnSaveProjectsAll) {
    btnSaveProjectsAll.addEventListener('click', async () => {
      await executeSave('ALL PROJECT & CATEGORY CHANGES');
    });
  }

  /* ================= 8. TAB 04: TOP HEADERS & CONTACT ================= */
  const formHeaders = document.getElementById('form-headers');

  function populateHeadersForm() {
    const h = currentData.headers || {};
    const about = h.about || {};
    const proj = h.projects || {};
    const contact = h.contact || {};

    document.getElementById('hdr-about-index').value = about.index || '01 / ABOUT ME';
    document.getElementById('hdr-about-title').value = about.title || 'ABOUT';
    document.getElementById('hdr-about-disc').value = about.discipline !== undefined ? about.discipline : 'INTERACTIVE SPATIAL DESIGN';
    document.getElementById('hdr-about-desc').value = about.description || 'Background, education, capabilities and the experiences driving my practice.';

    document.getElementById('hdr-projects-index').value = proj.index || '02 / VIEW PROJECT';
    document.getElementById('hdr-projects-title').value = proj.title || 'PROJECTS';
    document.getElementById('hdr-projects-disc').value = proj.discipline !== undefined ? proj.discipline : 'INTERACTIVE SPATIAL DESIGN';
    document.getElementById('hdr-projects-desc').value = proj.description || 'Seventeen works across academic study, competitions and professional practice.';

    document.getElementById('hdr-contact-index').value = contact.index || '03 / GET IN TOUCH';
    document.getElementById('hdr-contact-title').value = contact.title || 'CONTACT';
    document.getElementById('hdr-contact-disc').value = contact.discipline !== undefined ? contact.discipline : 'INTERACTIVE SPATIAL DESIGN';
    document.getElementById('hdr-contact-desc').value = contact.description || 'Available for collaborations, internships and thoughtful creative opportunities.';

    document.getElementById('hdr-contact-start-heading').value = contact.startProjectHeading || 'START A\nPROJECT';
    document.getElementById('hdr-contact-callout').value = contact.startProjectCallout || "Available for collaborations, freelance projects, and full-time opportunities. Let's build something meaningful together.";

    const p = currentData.profile || {};
    const hdrResUrl = document.getElementById('hdr-contact-resume-url');
    if (hdrResUrl) hdrResUrl.value = p.resumeUrl || '';
    const hdrResText = document.getElementById('hdr-contact-resume-text');
    if (hdrResText) hdrResText.value = p.resumeBtnText || 'VIEW RESUME';
  }

  function collectHeadersData() {
    if (!currentData.headers) currentData.headers = {};
    currentData.headers.about = {
      index: document.getElementById('hdr-about-index').value.trim(),
      title: document.getElementById('hdr-about-title').value.trim(),
      discipline: document.getElementById('hdr-about-disc').value.trim(),
      description: document.getElementById('hdr-about-desc').value.trim()
    };
    const mirrorToTab2 = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    mirrorToTab2('about-hdr-index-tab2', currentData.headers.about.index);
    mirrorToTab2('about-hdr-title-tab2', currentData.headers.about.title);
    mirrorToTab2('about-hdr-disc-tab2', currentData.headers.about.discipline);
    mirrorToTab2('about-hdr-desc-tab2', currentData.headers.about.description);
    currentData.headers.projects = {
      index: document.getElementById('hdr-projects-index').value.trim(),
      title: document.getElementById('hdr-projects-title').value.trim(),
      discipline: document.getElementById('hdr-projects-disc').value.trim(),
      description: document.getElementById('hdr-projects-desc').value.trim()
    };
    currentData.headers.contact = {
      index: document.getElementById('hdr-contact-index').value.trim(),
      title: document.getElementById('hdr-contact-title').value.trim(),
      discipline: document.getElementById('hdr-contact-disc').value.trim(),
      description: document.getElementById('hdr-contact-desc').value.trim(),
      startProjectHeading: document.getElementById('hdr-contact-start-heading').value.trim(),
      startProjectCallout: document.getElementById('hdr-contact-callout').value.trim()
    };

    if (!currentData.profile) currentData.profile = {};
    const hdrResUrl = document.getElementById('hdr-contact-resume-url');
    if (hdrResUrl) currentData.profile.resumeUrl = hdrResUrl.value.trim();
    const hdrResText = document.getElementById('hdr-contact-resume-text');
    if (hdrResText) currentData.profile.resumeBtnText = hdrResText.value.trim() || 'VIEW RESUME';
    mirrorToTab2('id-resume-url', currentData.profile.resumeUrl);
    mirrorToTab2('id-resume-btn-text', currentData.profile.resumeBtnText);
    mirrorToTab2('about-resume-url', currentData.profile.resumeUrl);
    mirrorToTab2('about-resume-btn-text', currentData.profile.resumeBtnText);
  }

  const btnSaveHeaders = document.getElementById('btn-save-headers');
  if (btnSaveHeaders) {
    btnSaveHeaders.addEventListener('click', async (e) => {
      e.preventDefault();
      await executeSave('TOP HEADERS & CONTACT TEXTS');
    });
  }

  if (formHeaders) {
    formHeaders.addEventListener('input', () => {
      collectHeadersData();
      triggerRealtimeSync(120);
    });
    formHeaders.addEventListener('submit', async (e) => {
      e.preventDefault();
      await executeSave('TOP HEADERS & CONTACT TEXTS');
    });
  }

  /* ================= 9. TAB 05: BACKUP & DATABASE ================= */
  // 1-Click Publishing: Downloads fresh database.js ready to deploy to live hosting!
  const btnDownloadDb = document.getElementById('btn-download-updated-database');
  if (btnDownloadDb) {
    btnDownloadDb.addEventListener('click', async () => {
      await executeSave('PORTFOLIO DATA');

      const freshCode = window.PortfolioDB.exportDatabaseJs();
      const blob = new Blob([freshCode], { type: 'application/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('⚡ UPDATED database.js DOWNLOADED! REPLACE IN PROJECT TO PUBLISH');
    });
  }

  // 1-Click Code Resync: Reloads fresh data from database.js file into the browser
  const btnSyncCode = document.getElementById('btn-sync-from-code');
  if (btnSyncCode) {
    btnSyncCode.addEventListener('click', async () => {
      const ok = confirm('This will reload all portfolio data directly from database.js in your project files and reset your local browser cache. Continue?');
      if (!ok) return;
      if (window.PortfolioDB && window.PortfolioDB.resetToCode) {
        currentData = await window.PortfolioDB.resetToCode();
      } else if (window.PortfolioDB && window.PortfolioDB.resetToDefaults) {
        currentData = await window.PortfolioDB.resetToDefaults();
      }
      populateAllForms();
      hasUnsavedChanges = false;
      updateSyncStatusUI();
      updateRawJsonInspector();
      showToast('🔄 SYNCHRONIZED SUCCESSFULLY WITH database.js CODE!');
    });
  }

  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = window.PortfolioDB.exportJSON();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moo_renee_portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PORTFOLIO BACKUP DOWNLOADED');
    });
  }

  const importFileInput = document.getElementById('import-json-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const res = await window.PortfolioDB.importJSON(evt.target.result);
          if (res.success) {
            currentData = await window.PortfolioDB.getData();
            populateAllForms();
            showToast('DATA RESTORED FROM BACKUP FILE');
          } else {
            alert('Import Error: ' + res.error);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  function updateRawJsonInspector() {
    const inspector = document.getElementById('raw-json-inspector');
    if (inspector) {
      inspector.value = JSON.stringify(currentData, null, 2);
    }
  }

  /* ================= 9B. CLOUD AUTO-SAVE (FIREBASE FIRESTORE) UI ================= */
  function updateCloudUI() {
    const badge = document.getElementById('cloud-status-badge');
    const syncBtn = document.getElementById('btn-cloud-sync-now');
    const disconnectBtn = document.getElementById('btn-cloud-disconnect');
    const connectedInfo = document.getElementById('cloud-connected-info');
    const projIdEl = document.getElementById('cloud-connected-project-id');
    const configWrap = document.getElementById('cloud-config-form-wrap');

    const status = window.PortfolioDB ? window.PortfolioDB.getCloudStatus() : { enabled: false };
    if (status.enabled && status.projectId) {
      if (badge) {
        badge.textContent = `🟢 CLOUD AUTO-SAVE ACTIVE (${status.projectId})`;
        badge.style.background = '#dcfce7';
        badge.style.color = '#15803d';
        badge.style.border = '1px solid #86efac';
      }
      if (syncBtn) syncBtn.style.display = 'inline-block';
      if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
      if (connectedInfo) connectedInfo.style.display = 'block';
      if (projIdEl) projIdEl.textContent = status.projectId;
      if (configWrap) configWrap.style.display = 'none';
    } else {
      if (badge) {
        badge.textContent = '⚪ LOCAL STORAGE MODE (NOT CONNECTED TO CLOUD)';
        badge.style.background = '#f3f4f6';
        badge.style.color = '#4b5563';
        badge.style.border = '1px solid #d1d5db';
      }
      if (syncBtn) syncBtn.style.display = 'none';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
      if (connectedInfo) connectedInfo.style.display = 'none';
      if (configWrap) configWrap.style.display = 'block';
    }

    refreshVisitorLogsUI();
  }

  async function refreshVisitorLogsUI() {
    const viewsBadge = document.getElementById('site-views-badge');
    const tbody = document.getElementById('visitor-log-tbody');
    if (!window.PortfolioDB || !window.PortfolioDB.getVisitStats) return;

    try {
      const stats = await window.PortfolioDB.getVisitStats();
      if (stats && typeof stats.totalViews === 'number') {
        if (viewsBadge) {
          viewsBadge.textContent = `TOTAL CLOUD VIEWS: ${stats.totalViews}`;
          viewsBadge.style.background = '#dcfce7';
          viewsBadge.style.color = '#15803d';
          viewsBadge.style.border = '1px solid #86efac';
        }

        if (tbody) {
          if (Array.isArray(stats.recentVisits) && stats.recentVisits.length > 0) {
            tbody.innerHTML = '';
            stats.recentVisits.forEach((v, idx) => {
              const tr = document.createElement('tr');
              tr.style.borderBottom = '1px solid #eee';
              tr.style.background = idx % 2 === 0 ? '#fff' : '#f9f9fb';
              const isNamed = v.username && v.username !== 'Anonymous Visitor';
              const userBadge = isNamed
                ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 2px; background: #dcfce7; color: #15803d; font-weight: 700;">${v.username}</span>`
                : `<span style="color: #888;">Anonymous</span>`;
              tr.innerHTML = `
                <td style="padding: 8px 12px; font-weight: 600;">${userBadge}</td>
                <td style="padding: 8px 12px; font-weight: 600; color: #112250;">${v.formattedTime || v.time || '-'}</td>
                <td style="padding: 8px 12px; color: #333;">${v.timezone || 'Local'}</td>
                <td style="padding: 8px 12px; color: #555;">${v.device || 'Desktop'}</td>
                <td style="padding: 8px 12px; color: #112250; font-weight: 600;">${v.page || 'Home'}</td>
                <td style="padding: 8px 12px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 2px; background: #eef2ff; color: #3730a3; font-size: 0.68rem; font-weight: 700;">${v.referrer || 'Direct'}</span></td>
              `;
              tbody.appendChild(tr);
            });
          } else {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #666;">Cloud active, waiting for incoming live visits...</td></tr>`;
          }
        }
      } else {
        if (viewsBadge) viewsBadge.textContent = 'CONNECT FIREBASE TO ACTIVATE';
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #666;">Connect Firebase below to begin logging live visitors.</td></tr>`;
      }
    } catch(e) {}
  }

  const btnRefreshVisits = document.getElementById('btn-refresh-visits');
  if (btnRefreshVisits) {
    btnRefreshVisits.addEventListener('click', async () => {
      btnRefreshVisits.textContent = 'REFRESHING...';
      await refreshVisitorLogsUI();
      btnRefreshVisits.textContent = '🔄 REFRESH VISITOR LOG';
      showToast('VISITOR LOG REFRESHED');
    });
  }

  // Personalized Tracking Link Generator
  const btnGenTrack = document.getElementById('btn-generate-track-link');
  if (btnGenTrack) {
    btnGenTrack.addEventListener('click', () => {
      const input = document.getElementById('tracking-username-input');
      const resSpan = document.getElementById('track-link-result');
      const tag = input ? input.value.trim().replace(/^@/, '') : '';
      if (!tag) {
        alert('Please enter a name or tag first (e.g. John or Sarah_IG).');
        return;
      }
      const baseUrl = window.location.origin + window.location.pathname.replace(/\/admin(\.html)?$/, '') + '/';
      const fullUrl = `${baseUrl}?u=${encodeURIComponent(tag)}`;
      try {
        navigator.clipboard.writeText(fullUrl).then(() => {
          if (resSpan) resSpan.textContent = `✓ Copied: ${fullUrl}`;
          showToast(`TRACKING LINK COPIED FOR @${tag}!`);
        }).catch(() => {
          if (resSpan) resSpan.textContent = fullUrl;
        });
      } catch(e) {
        if (resSpan) resSpan.textContent = fullUrl;
      }
    });
  }

  const btnSaveCloudConfig = document.getElementById('btn-save-cloud-config');
  if (btnSaveCloudConfig) {
    btnSaveCloudConfig.addEventListener('click', async () => {
      const inputEl = document.getElementById('firebase-config-input');
      const val = inputEl ? inputEl.value.trim() : '';
      if (!val) {
        alert('Please paste your Firebase configuration object or JSON first.');
        return;
      }
      btnSaveCloudConfig.textContent = 'CONNECTING...';
      btnSaveCloudConfig.disabled = true;
      const res = await window.PortfolioDB.connectCloud(val);
      btnSaveCloudConfig.textContent = 'CONNECT & AUTO-SAVE TO CLOUD';
      btnSaveCloudConfig.disabled = false;
      if (res.success) {
        updateCloudUI();
        showToast(`⚡ CLOUD AUTO-SAVE CONNECTED TO "${res.projectId}"! PORTFOLIO SYNCED`);
      } else {
        alert('Firebase Connection Error: ' + res.error);
      }
    });
  }

  const btnCloudSyncNow = document.getElementById('btn-cloud-sync-now');
  if (btnCloudSyncNow) {
    btnCloudSyncNow.addEventListener('click', async () => {
      btnCloudSyncNow.textContent = 'SYNCING...';
      btnCloudSyncNow.disabled = true;
      try {
        const cur = await window.PortfolioDB.getData();
        const ok = await window.PortfolioDB.saveToCloud(cur);
        if (ok && ok.success) {
          showToast('✓ CLOUD DATABASE SYNCED SUCCESSFULLY');
        } else {
          alert('Cloud sync failed: ' + ((ok && ok.error) || 'Check your internet connection.'));
        }
      } catch (err) {
        alert('Cloud sync failed: ' + err.message);
      } finally {
        btnCloudSyncNow.textContent = '⚡ SYNC NOW';
        btnCloudSyncNow.disabled = false;
      }
    });
  }

  const btnDownloadFirebaseConfig = document.getElementById('btn-download-firebase-config');
  if (btnDownloadFirebaseConfig) {
    btnDownloadFirebaseConfig.addEventListener('click', () => {
      const stored = localStorage.getItem('moo_renee_firebase_config') || (window.MOO_FIREBASE_CONFIG ? JSON.stringify(window.MOO_FIREBASE_CONFIG) : null);
      if (!stored) {
        alert('Please connect Firebase first.');
        return;
      }
      const cfg = typeof stored === 'string' ? JSON.parse(stored) : stored;
      const fileContent = `/**\n * MOO RENEE — Google Firebase Cloud Auto-Save Configuration\n * Deployed to Vercel — allows all visitors worldwide to receive instant live CMS updates\n */\nwindow.MOO_FIREBASE_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;
      const blob = new Blob([fileContent], { type: 'application/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'firebase-config.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📥 firebase-config.js DOWNLOADED! COMMIT TO GITHUB / VERCEL');
    });
  }

  const btnCloudDisconnect = document.getElementById('btn-cloud-disconnect');
  if (btnCloudDisconnect) {
    btnCloudDisconnect.addEventListener('click', () => {
      if (confirm('Disconnect Firebase Cloud Auto-Save? Your portfolio will switch back to local browser storage.')) {
        window.PortfolioDB.disconnectCloud();
        updateCloudUI();
        showToast('FIREBASE CLOUD DISCONNECTED');
      }
    });
  }

  const btnToggleGuide = document.getElementById('btn-toggle-firebase-guide');
  if (btnToggleGuide) {
    btnToggleGuide.addEventListener('click', () => {
      const box = document.getElementById('firebase-guide-box');
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  /* ================= 9B. PAGE ORDER & SEQUENCE CONTROLLER ================= */
  const PAGE_ORDER_INFO = {
    home: {
      key: 'home',
      title: 'HOME PAGE',
      icon: '🏛️',
      desc: 'Front landing page with brutalist hero letters, designer meta, and live summary boxes.'
    },
    projects: {
      key: 'projects',
      title: 'PROJECTS CATALOG',
      icon: '📁',
      desc: 'Projects gallery showcase, dynamic category filter tabs, and case study viewer.'
    },
    about: {
      key: 'about',
      title: 'ABOUT PAGE',
      icon: '👤',
      desc: 'Studio biography, software toolkits, education history, and skills matrix.'
    },
    contact: {
      key: 'contact',
      title: 'CONTACT PAGE',
      icon: '✉️',
      desc: 'Direct channels, email/phone links, start-a-project callout, and resume button.'
    }
  };

  function renderPageOrderManager() {
    if (!currentData.pageOrder || !Array.isArray(currentData.pageOrder) || currentData.pageOrder.length === 0) {
      currentData.pageOrder = ['home', 'projects', 'about', 'contact'];
    } else {
      ['home', 'projects', 'about', 'contact'].forEach(k => {
        if (!currentData.pageOrder.includes(k)) currentData.pageOrder.push(k);
      });
    }

    if (!currentData.pageVisibility) {
      currentData.pageVisibility = { home: true, about: true, projects: true, contact: true };
    }
    const pv = currentData.pageVisibility;
    const po = currentData.pageOrder;

    const grid = document.getElementById('page-order-manager-grid');
    if (!grid) return;
    grid.innerHTML = '';

    po.forEach((pageKey, idx) => {
      const info = PAGE_ORDER_INFO[pageKey] || {
        key: pageKey,
        title: pageKey.toUpperCase() + ' PAGE',
        icon: '📄',
        desc: ''
      };
      const isVis = pv[pageKey] !== false;

      const card = document.createElement('div');
      card.className = 'page-order-card' + (isVis ? '' : ' is-hidden');
      card.innerHTML = `
        <div>
          <div class="page-order-top-row">
            <span class="page-order-pos-badge">ORDER 0${idx + 1}</span>
            <span class="page-vis-badge ${isVis ? 'visible' : 'hidden'}">
              ${isVis ? '● VISIBLE' : '✕ HIDDEN'}
            </span>
          </div>
          <h4 class="page-vis-title" style="margin-top: 0.65rem;">${info.icon} ${info.title}</h4>
          <p class="page-vis-desc" style="margin-top: 0.4rem;">${info.desc}</p>
        </div>

        <div>
          <!-- Move Up / Down Buttons -->
          <div class="page-order-actions-row">
            <button type="button" class="btn-order-move btn-order-up" ${idx === 0 ? 'disabled' : ''} title="Move page earlier in sequence">
              ▲ MOVE UP
            </button>
            <button type="button" class="btn-order-move btn-order-down" ${idx === po.length - 1 ? 'disabled' : ''} title="Move page later in sequence">
              ▼ MOVE DOWN
            </button>
          </div>

          <!-- Show / Hide Button -->
          <button type="button" class="page-vis-btn ${isVis ? 'btn-hide' : 'btn-show'}" style="margin-top: 0.5rem;" data-page="${pageKey}">
            ${isVis ? '✕ HIDE THIS PAGE' : '✓ SHOW THIS PAGE'}
          </button>
        </div>
      `;

      // Move Up handler
      const btnUp = card.querySelector('.btn-order-up');
      if (btnUp && idx > 0) {
        btnUp.addEventListener('click', () => {
          const temp = po[idx];
          po[idx] = po[idx - 1];
          po[idx - 1] = temp;
          renderPageOrderManager();
          triggerRealtimeSync(0);
          showToast(`Page sequence: ${po.map((k, i) => `${i + 1}. ${k.toUpperCase()}`).join(' → ')}`);
        });
      }

      // Move Down handler
      const btnDown = card.querySelector('.btn-order-down');
      if (btnDown && idx < po.length - 1) {
        btnDown.addEventListener('click', () => {
          const temp = po[idx];
          po[idx] = po[idx + 1];
          po[idx + 1] = temp;
          renderPageOrderManager();
          triggerRealtimeSync(0);
          showToast(`Page sequence: ${po.map((k, i) => `${i + 1}. ${k.toUpperCase()}`).join(' → ')}`);
        });
      }

      // Show/Hide handler
      const btnVis = card.querySelector('.page-vis-btn');
      if (btnVis) {
        btnVis.addEventListener('click', () => {
          pv[pageKey] = !isVis;
          renderPageOrderManager();
          renderSectionVisibilityManager();
          triggerRealtimeSync(0);
          showToast(`Page "${info.title}" is now ${pv[pageKey] ? 'VISIBLE' : 'HIDDEN'} on visitor website!`);
        });
      }

      grid.appendChild(card);
    });

    // Reset button
    const btnReset = document.getElementById('btn-reset-page-order');
    if (btnReset) {
      btnReset.onclick = () => {
        currentData.pageOrder = ['home', 'projects', 'about', 'contact'];
        renderPageOrderManager();
        triggerRealtimeSync(0);
        showToast('Page sequence reset to default order (Home → Projects → About → Contact)!');
      };
    }
  }

  /* ================= 9C. MASTER SECTION VISIBILITY CONTROLLER ================= */
  let currentSecVisFilter = 'all';
  let currentSecVisSearch = '';

  const ALL_SECTIONS_REGISTRY = [
    // HOME PAGE
    { key: 'homeHero', page: 'home', pageTitle: 'HOME', title: 'Monumental Hero Letters ("PORT / FOLIO")', desc: 'Central brutalist animated letters and compass drafting watermark.' },
    { key: 'homeMetaLeft', page: 'home', pageTitle: 'HOME', title: 'Left Designer & Discipline Meta', desc: 'DES. BY MOO RENEE, Interactive Spatial Design, and copyright year.' },
    { key: 'homeMetaRight', page: 'home', pageTitle: 'HOME', title: 'Right Academic Degree & Years Meta', desc: 'Bachelor in Interactive Spatial Design (Hons) 2024 - 2026.' },
    { key: 'homeBottomBar', page: 'home', pageTitle: 'HOME', title: 'Bottom Connected Info Bar', desc: 'Full bottom bar container with email, phone, behance and enter links.' },
    { key: 'homeEmail', page: 'home', pageTitle: 'HOME', title: 'Bottom Email Cell', desc: 'Direct email mailto link in the bottom grid bar.' },
    { key: 'homePhone', page: 'home', pageTitle: 'HOME', title: 'Bottom Phone Cell', desc: 'Direct phone tel link in the bottom grid bar.' },
    { key: 'homeBehance', page: 'home', pageTitle: 'HOME', title: 'Bottom Behance Cell', desc: 'Direct external Behance profile link in the bottom grid bar.' },
    { key: 'homeEnterPortfolio', page: 'home', pageTitle: 'HOME', title: 'Bottom "Enter Portfolio ->" Link', desc: 'Action button that navigates directly to your portfolio catalog.' },

    // ABOUT PAGE
    { key: 'aboutHeader', page: 'about', pageTitle: 'ABOUT', title: 'About Top Editorial Header Stage', desc: '6-column architectural header with index, giant ABOUT title, and intro description.' },
    { key: 'aboutProfileCard', page: 'about', pageTitle: 'ABOUT', title: 'Portrait Photo & Studio Profile Card', desc: 'Headshot portrait image, designer name, and direct social links.' },
    { key: 'aboutBio', page: 'about', pageTitle: 'ABOUT', title: 'Headline Title & Biography Narrative', desc: 'Design manifesto headline, short bio paragraph, and focus pills.' },
    { key: 'aboutSkillsTags', page: 'about', pageTitle: 'ABOUT', title: 'Core Focus Skill Pills', desc: 'Upper pill tags (UI/UX, AR/VR, GAME DESIGN, 3D MODELING, etc.).' },
    { key: 'aboutStats', page: 'about', pageTitle: 'ABOUT', title: '4-Column Stat Counters Row', desc: 'Studying design, completed projects, competitions & awards counters.' },
    { key: 'aboutEducation', page: 'about', pageTitle: 'ABOUT', title: 'Education History Checklist', desc: 'Chronological timeline of schools, college, degrees, and CGPA.' },
    { key: 'aboutSoftware', page: 'about', pageTitle: 'ABOUT', title: 'Software Toolkits Grid', desc: 'Tiles showing software tool logos (AU, AN, AE, AI, DW, UN, BL, FG).' },
    { key: 'aboutLanguages', page: 'about', pageTitle: 'ABOUT', title: 'Languages Proficiency Table', desc: 'Languages spoken and fluency levels (Chinese, English, Malay).' },
    { key: 'aboutTechnical', page: 'about', pageTitle: 'ABOUT', title: 'Technical Skills Matrix', desc: 'Interactive pills for UI/UX, 3D Modeling, AR/VR, Coding, etc.' },
    { key: 'aboutPersonal', page: 'about', pageTitle: 'ABOUT', title: 'Personal Skills Matrix', desc: 'Pills for Teamwork, Creativity, Time Management, Responsibility, etc.' },
    { key: 'aboutExperience', page: 'about', pageTitle: 'ABOUT', title: 'Professional Experience Timeline', desc: 'Internships, industry roles, and company affiliations.' },
    { key: 'aboutAchievements', page: 'about', pageTitle: 'ABOUT', title: 'Honors & Achievements List', desc: 'Competitions awards, dean\'s list, and recognitions.' },
    { key: 'aboutCompetitions', page: 'about', pageTitle: 'ABOUT', title: 'Competitions & Extracurricular List', desc: 'Timeline of design competitions and extracurricular events entered.' },

    // PROJECTS PAGE
    { key: 'projectsHeader', page: 'projects', pageTitle: 'PROJECTS', title: 'Projects Top Editorial Header Stage', desc: '6-column architectural header with index, giant PROJECTS title, and description.' },
    { key: 'projectsFilterBar', page: 'projects', pageTitle: 'PROJECTS', title: 'Multi-Tier Category & Sub-Label Filter Bar', desc: 'Main section pills (Academic, Competition, Internship) and sub-label tags.' },
    { key: 'projectsGrid', page: 'projects', pageTitle: 'PROJECTS', title: 'Projects Catalog Cards Grid & Spec Table', desc: 'Main showcase of all project cards with thumbnails and links.' },

    // CONTACT PAGE
    { key: 'contactHeader', page: 'contact', pageTitle: 'CONTACT', title: 'Contact Top Editorial Header Stage', desc: '6-column architectural header with index, giant CONTACT title, and description.' },
    { key: 'contactStartProject', page: 'contact', pageTitle: 'CONTACT', title: '"START A PROJECT" Callout & Studio Heading', desc: 'Large bold typography statement and creative collaboration callout.' },
    { key: 'contactChannels', page: 'contact', pageTitle: 'CONTACT', title: 'Direct Contact Channels Table', desc: 'Direct email, phone number, Behance, and Linktree links.' },
    { key: 'contactResumeBtn', page: 'contact', pageTitle: 'CONTACT', title: '"VIEW RESUME" Action Button', desc: 'Customizable button with direct link to view resume/CV.' },

    // GLOBAL
    { key: 'siteFooter', page: 'global', pageTitle: 'GLOBAL', title: 'Global Bottom Footer Bar', desc: 'Bottom website bar with designer name, secret trigger, and university meta.' }
  ];

  function renderSectionVisibilityManager() {
    if (!currentData.sectionVisibility || typeof currentData.sectionVisibility !== 'object') {
      currentData.sectionVisibility = {};
    }
    const sv = currentData.sectionVisibility;

    // Update count labels
    const countAll = document.getElementById('count-sec-all');
    if (countAll) countAll.textContent = ALL_SECTIONS_REGISTRY.length;
    ['home', 'about', 'projects', 'contact', 'global'].forEach(pKey => {
      const cEl = document.getElementById(`count-sec-${pKey}`);
      if (cEl) {
        cEl.textContent = ALL_SECTIONS_REGISTRY.filter(s => s.page === pKey).length;
      }
    });

    const grid = document.getElementById('section-visibility-manager-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Filter items
    const query = (currentSecVisSearch || '').trim().toLowerCase();
    const filtered = ALL_SECTIONS_REGISTRY.filter(item => {
      if (currentSecVisFilter !== 'all' && item.page !== currentSecVisFilter) return false;
      if (query) {
        const hay = `${item.title} ${item.desc} ${item.pageTitle} ${item.key}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; font-family: var(--font-mono); color: #777; border: 1.5px dashed #ccc;">
          NO SECTIONS FOUND MATCHING "${currentSecVisSearch.toUpperCase()}".
        </div>
      `;
      return;
    }

    filtered.forEach(sec => {
      const isVis = sv[sec.key] !== false;
      const card = document.createElement('div');
      card.className = 'sec-vis-card' + (isVis ? '' : ' is-hidden');
      card.innerHTML = `
        <div>
          <div class="sec-vis-card-header">
            <span class="sec-vis-page-tag">${sec.pageTitle}</span>
            <span class="page-vis-badge ${isVis ? 'visible' : 'hidden'}">
              ${isVis ? '● VISIBLE' : '✕ HIDDEN'}
            </span>
          </div>
          <h4 class="sec-vis-title" style="margin-top: 0.6rem;">${sec.title}</h4>
          <p class="sec-vis-desc" style="margin-top: 0.35rem;">${sec.desc}</p>
        </div>
        <button type="button" class="sec-vis-btn ${isVis ? 'btn-hide' : 'btn-show'}" data-key="${sec.key}">
          ${isVis ? '✕ HIDE THIS SECTION' : '✓ SHOW THIS SECTION'}
        </button>
      `;

      const btn = card.querySelector('.sec-vis-btn');
      btn.addEventListener('click', () => {
        const newVal = !isVis;
        sv[sec.key] = newVal;

        // Synchronize with specific sub-fields
        if (sec.key === 'aboutProfileCard') {
          if (currentData.profile) currentData.profile.showProfileCard = newVal;
          if (currentData.about) currentData.about.showProfileCard = newVal;
          const idChk = document.getElementById('id-show-profile-card');
          if (idChk) idChk.checked = newVal;
          const tab2Chk = document.getElementById('about-show-profile-card-tab2');
          if (tab2Chk) tab2Chk.checked = newVal;
        }
        if (sec.key === 'aboutStats' && currentData.profile) {
          currentData.profile.showStats = newVal;
        }
        if (currentData.about && currentData.about.sectionSettings) {
          const mapToSS = {
            aboutEducation: 'education',
            aboutSoftware: 'software',
            aboutLanguages: 'languages',
            aboutTechnical: 'technicalSkills',
            aboutPersonal: 'personalSkills',
            aboutExperience: 'experience',
            aboutAchievements: 'achievements',
            aboutCompetitions: 'competitions'
          };
          const ssKey = mapToSS[sec.key];
          if (ssKey && currentData.about.sectionSettings[ssKey]) {
            currentData.about.sectionSettings[ssKey].enabled = newVal;
          }
        }

        renderSectionVisibilityManager();
        triggerRealtimeSync(0);
        showToast(`Section "${sec.title}" is now ${newVal ? 'VISIBLE' : 'HIDDEN'} on live website!`);
      });

      grid.appendChild(card);
    });

    // Wire filter pills
    document.querySelectorAll('.sec-filter-pill').forEach(pill => {
      pill.onclick = () => {
        document.querySelectorAll('.sec-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentSecVisFilter = pill.getAttribute('data-sec-filter') || 'all';
        renderSectionVisibilityManager();
      };
    });

    // Wire search input
    const searchInput = document.getElementById('sec-vis-search-input');
    if (searchInput && !searchInput.dataset.wired) {
      searchInput.dataset.wired = 'true';
      searchInput.addEventListener('input', (e) => {
        currentSecVisSearch = e.target.value;
        renderSectionVisibilityManager();
      });
    }

    // Wire Show All button
    const btnShowAll = document.getElementById('btn-sec-vis-show-all');
    if (btnShowAll) {
      btnShowAll.onclick = () => {
        ALL_SECTIONS_REGISTRY.forEach(s => {
          sv[s.key] = true;
        });
        if (currentData.profile) currentData.profile.showStats = true;
        if (currentData.about && currentData.about.sectionSettings) {
          Object.values(currentData.about.sectionSettings).forEach(ss => { if (ss) ss.enabled = true; });
        }
        renderSectionVisibilityManager();
        triggerRealtimeSync(0);
        showToast('All sections are now VISIBLE on live website!');
      };
    }

    // Wire Reset Defaults button
    const btnResetDefaults = document.getElementById('btn-sec-vis-reset-defaults');
    if (btnResetDefaults) {
      btnResetDefaults.onclick = () => {
        const def = (window.DEFAULT_PORTFOLIO_DATA && window.DEFAULT_PORTFOLIO_DATA.sectionVisibility) || {};
        currentData.sectionVisibility = Object.assign({}, def);
        if (currentData.profile) currentData.profile.showStats = true;
        if (currentData.about && currentData.about.sectionSettings) {
          Object.values(currentData.about.sectionSettings).forEach(ss => { if (ss) ss.enabled = true; });
        }
        renderSectionVisibilityManager();
        triggerRealtimeSync(0);
        showToast('Section visibility reset to defaults!');
      };
    }
  }

  /* ================= 9D. PAGE VISIBILITY MASTER CONTROLLER ================= */
  function renderPageVisibilityManager() {
    renderPageOrderManager();
    renderSectionVisibilityManager();

    if (!currentData.pageVisibility) {
      currentData.pageVisibility = { home: true, about: true, projects: true, contact: true };
    }
    const pv = currentData.pageVisibility;

    // Render Individual Top Banners in Tab 01, Tab 02, Tab 03
    ['contact', 'about', 'projects'].forEach(pageKey => {
      const banner = document.getElementById(`banner-vis-${pageKey}`);
      if (banner) {
        const isVis = pv[pageKey] !== false;
        const pageTitle = pageKey.toUpperCase() + ' PAGE';
        banner.innerHTML = `
          <div class="page-vis-banner-info">
            <span class="page-vis-banner-title">${pageTitle} VISIBILITY:</span>
            <span class="page-vis-badge ${isVis ? 'visible' : 'hidden'}">
              ${isVis ? '● VISIBLE ON WEBSITE' : '✕ HIDDEN FROM VISITORS'}
            </span>
          </div>
          <button type="button" class="editor-btn-sm" style="${isVis ? 'color: #b91c1c; border-color: #b91c1c;' : 'background: #112250; color: #fff; border-color: #112250;'}">
            ${isVis ? '✕ HIDE THIS PAGE FROM VISITORS' : '✓ SHOW THIS PAGE ON WEBSITE'}
          </button>
        `;
        const btn = banner.querySelector('button');
        btn.addEventListener('click', () => {
          pv[pageKey] = !isVis;
          renderPageVisibilityManager();
          triggerRealtimeSync(0);
          showToast(`Page "${pageTitle}" is now ${pv[pageKey] ? 'VISIBLE' : 'HIDDEN'} on visitor website!`);
        });
      }
    });
  }

  /* ================= 9C. ADMIN CREDENTIALS UI ================= */
  function populateCredentialsForm() {
    let auth = { username: 'RENEE@MOO081706', password: '36987@RENEE6667' };
    if (window.PortfolioDB && window.PortfolioDB.getAdminAuth) {
      auth = window.PortfolioDB.getAdminAuth();
    } else {
      try {
        const custom = localStorage.getItem('renee_admin_auth_custom');
        if (custom) auth = JSON.parse(custom);
      } catch(e) {}
    }

    const userInput = document.getElementById('cred-username');
    const passInput = document.getElementById('cred-password');
    const sidebarUser = document.getElementById('sidebar-current-username');

    if (userInput) userInput.value = auth.username || 'RENEE@MOO081706';
    if (passInput) passInput.value = auth.password || '36987@RENEE6667';
    if (sidebarUser) sidebarUser.textContent = auth.username || 'RENEE@MOO081706';
  }

  function setupCredentialsUI() {
    populateCredentialsForm();

    const passInput = document.getElementById('cred-password');
    const toggleBtn = document.getElementById('btn-toggle-cred-pass');
    if (toggleBtn && passInput) {
      toggleBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          toggleBtn.textContent = '🙈 HIDE';
          toggleBtn.title = 'Hide password';
        } else {
          passInput.type = 'password';
          toggleBtn.textContent = '👁️ SHOW';
          toggleBtn.title = 'Show password';
        }
      });
    }

    const credForm = document.getElementById('admin-credentials-form');
    if (credForm) {
      credForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = document.getElementById('cred-username');
        const passInput = document.getElementById('cred-password');
        const statusNote = document.getElementById('cred-status-note');
        const submitBtn = document.getElementById('btn-save-credentials');

        const newU = (userInput ? userInput.value : '').trim();
        const newP = (passInput ? passInput.value : '').trim();

        if (!newU || !newP) {
          alert('Username and Password cannot be empty.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'SAVING...';
        }

        try {
          if (window.PortfolioDB && window.PortfolioDB.updateAdminAuth) {
            await window.PortfolioDB.updateAdminAuth(newU, newP);
          } else {
            localStorage.setItem('renee_admin_auth_custom', JSON.stringify({ username: newU, password: newP }));
          }

          populateCredentialsForm();
          showToast('🔐 ADMIN CREDENTIALS UPDATED & SAVED!');

          if (statusNote) {
            statusNote.style.display = 'inline-block';
            setTimeout(() => {
              statusNote.style.display = 'none';
            }, 4000);
          }
        } catch(err) {
          alert('Error saving credentials: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 SAVE & UPDATE CREDENTIALS';
          }
        }
      });
    }
  }

  /* ================= 10. INITIALIZE ALL FORMS ================= */
  function populateAllForms() {
    populateIdentityForm();
    renderAboutTab();
    renderMainCategories();
    renderSublabels();
    renderProjectsGrid();
    populateHeadersForm();
    populateCredentialsForm();
    renderPageVisibilityManager();
    updateRawJsonInspector();
    updateCloudUI();
  }

  setupCredentialsUI();
  populateAllForms();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
