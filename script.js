/**
 * MOO RENEE — ARCHITECTURAL PORTFOLIO CONTROLLER
 * Full 17 Projects Management, Category & Discipline Filtering,
 * Case Study Continuous Roll (0px Gap), and Real-time Database Sync.
 */

document.addEventListener('DOMContentLoaded', async () => {
  /* ================= 1. ROUTER & IMMEDIATE HASH NAVIGATION ================= */
  const navTabs = document.querySelectorAll('.nav-tab[data-view]');
  const drawerLinks = document.querySelectorAll('.drawer-link[data-view]');
  const pageViews = document.querySelectorAll('.page-view');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');

  let isInitialLoad = true;
  let currentActiveViewId = null;
  let portfolioData = (window.PortfolioDB && window.PortfolioDB.getImmediateData)
    ? window.PortfolioDB.getImmediateData()
    : ((window.PortfolioDB && window.PortfolioDB.memoryData) ? window.PortfolioDB.memoryData : null);
  let currentActiveProjectId = null;

  function findProjectIndex(projs, targetId) {
    if (!Array.isArray(projs) || projs.length === 0 || !targetId) return 0;
    const sTarget = String(targetId).trim().toLowerCase();
    const numTarget = parseInt(sTarget.replace(/\D/g, ''), 10);

    // 1. Direct ID match (case-insensitive)
    let idx = projs.findIndex(p => p && String(p.id || '').trim().toLowerCase() === sTarget);
    if (idx !== -1) return idx;

    // 2. Direct Index match (e.g. "02" === "02")
    idx = projs.findIndex(p => p && String(p.index || '').trim().toLowerCase() === sTarget);
    if (idx !== -1) return idx;

    // 3. Numeric index match (e.g. "2" matches "02", or "p2" matches "02")
    if (!isNaN(numTarget)) {
      idx = projs.findIndex(p => {
        if (!p) return false;
        const pIdxNum = parseInt(String(p.index || '').replace(/\D/g, ''), 10);
        const pIdNum = parseInt(String(p.id || '').replace(/\D/g, ''), 10);
        return pIdxNum === numTarget || pIdNum === numTarget;
      });
      if (idx !== -1) return idx;
    }

    // 4. Slug / Title match
    idx = projs.findIndex(p => p && p.title && p.title.toLowerCase().replace(/[^a-z0-9]/g, '') === sTarget.replace(/[^a-z0-9]/g, ''));
    if (idx !== -1) return idx;

    return 0;
  }

  function navigateTo(viewId, param = null) {
    const isViewChange = (currentActiveViewId !== viewId);
    currentActiveViewId = viewId;

    const earlyStyle = document.getElementById('early-route-style');
    if (earlyStyle) earlyStyle.remove();

    pageViews.forEach(view => view.classList.remove('active'));

    let activeNavKey = viewId;
    if (viewId === 'project-detail') {
      activeNavKey = 'projects';
    }

    navTabs.forEach(tab => {
      if (tab.getAttribute('data-view') === activeNavKey) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    if (viewId === 'project-detail' && param) {
      currentActiveProjectId = param;
      if (portfolioData) renderProjectDetail(param);
      const detailView = document.getElementById('view-project-detail');
      if (detailView) detailView.classList.add('active');
      if (portfolioData) {
        const pIdx = findProjectIndex(portfolioData.projects, param);
        const curProj = (portfolioData.projects || [])[pIdx];
        if (window.PortfolioDB && window.PortfolioDB.recordVisit && curProj) {
          window.PortfolioDB.recordVisit({ page: 'Project: ' + curProj.title });
        }
      }
    } else {
      if (viewId === 'projects' && portfolioData) {
        try { renderProjectsCatalog(); } catch(e) {}
      }
      const targetView = document.getElementById('view-' + viewId);
      if (targetView) targetView.classList.add('active');
    }

    document.body.classList.toggle('on-home', viewId === 'home');

    // Only scroll to top if the view actually CHANGED (e.g. from home to projects), never on refresh or background data sync!
    if (!isInitialLoad && isViewChange) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (mobileDrawer) {
      mobileDrawer.classList.remove('open');
    }
  }

  function getFirstVisibleView(pv) {
    const order = (portfolioData && Array.isArray(portfolioData.pageOrder) && portfolioData.pageOrder.length > 0)
      ? portfolioData.pageOrder
      : ['home', 'projects', 'about', 'contact'];
    for (const key of order) {
      if (!pv || pv[key] !== false) return key;
    }
    return 'home';
  }

  function applyPageOrder() {
    const order = (portfolioData && Array.isArray(portfolioData.pageOrder) && portfolioData.pageOrder.length > 0)
      ? portfolioData.pageOrder
      : ['home', 'projects', 'about', 'contact'];

    // 1. Re-order desktop header navigation tabs in #main-nav
    const mainNav = document.getElementById('main-nav');
    const themeBtn = document.getElementById('nav-theme-toggle');
    if (mainNav) {
      order.forEach(pageKey => {
        const tab = mainNav.querySelector(`.nav-tab[data-view="${pageKey}"]`);
        if (tab && themeBtn) {
          mainNav.insertBefore(tab, themeBtn);
        } else if (tab) {
          mainNav.appendChild(tab);
        }
      });
    }

    // 2. Re-order mobile drawer links in #mobile-drawer .drawer-body
    const drawerBody = document.querySelector('#mobile-drawer .drawer-body');
    const drawerThemeBtn = document.getElementById('drawer-theme-btn');
    if (drawerBody) {
      order.forEach((pageKey, idx) => {
        const link = drawerBody.querySelector(`.drawer-link[data-view="${pageKey}"]`);
        if (link) {
          const numSpan = link.querySelector('span');
          if (numSpan) {
            numSpan.textContent = String(idx + 1).padStart(2, '0');
          }
          if (drawerThemeBtn) {
            drawerBody.insertBefore(link, drawerThemeBtn);
          } else {
            drawerBody.appendChild(link);
          }
        }
      });
    }

    // 3. Update Homepage "Enter Portfolio" link target to first visible subpage
    const enterLink = document.getElementById('home-enter-link');
    if (enterLink) {
      const pv = (portfolioData && portfolioData.pageVisibility) || {};
      const subpages = order.filter(k => k !== 'home' && pv[k] !== false);
      const targetSubpage = subpages.length > 0 ? subpages[0] : 'projects';
      enterLink.setAttribute('href', '#' + targetSubpage);
    }
  }

  function updateHomeBottomBarLayout() {
    const bottomBar = document.getElementById('home-bottom-bar') || document.querySelector('.home-bottom-grid-bar');
    if (!bottomBar) return;
    const cells = Array.from(bottomBar.querySelectorAll('.bottom-cell'));
    const visibleCells = cells.filter(c => c.style.display !== 'none');
    const count = visibleCells.length;
    if (count === 0) {
      bottomBar.style.display = 'none';
    } else {
      bottomBar.style.display = 'grid';
      bottomBar.style.setProperty('--home-bottom-cols', count);
      if (window.innerWidth > 900) {
        bottomBar.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
      } else {
        bottomBar.style.removeProperty('grid-template-columns');
      }
      cells.forEach(c => c.classList.remove('is-last-visible'));
      if (visibleCells.length > 0) {
        visibleCells[visibleCells.length - 1].classList.add('is-last-visible');
      }
    }
  }
  window.addEventListener('resize', updateHomeBottomBarLayout);

  function applySectionVisibility() {
    const sv = (portfolioData && portfolioData.sectionVisibility) || {};
    const p = (portfolioData && portfolioData.profile) || {};
    const a = (portfolioData && portfolioData.about) || {};
    const h = (portfolioData && portfolioData.home) || {};

    const sectionElements = [
      // HOME PAGE SECTIONS
      { key: 'homeHero', el: document.getElementById('home-center-hero') },
      { key: 'homeMetaLeft', el: document.querySelector('.home-left-col') },
      { key: 'homeMetaRight', el: document.querySelector('.home-right-col') },
      { key: 'homeBottomBar', el: document.getElementById('home-bottom-bar') },
      { key: 'homeEmail', el: document.getElementById('home-email-box') },
      { key: 'homePhone', el: document.getElementById('home-phone-box') },
      { key: 'homeBehance', el: document.getElementById('home-behance-box') },
      { key: 'homeEnterPortfolio', el: document.getElementById('home-enter-box') },

      // ABOUT PAGE SECTIONS
      { key: 'aboutHeader', el: document.querySelector('#view-about .subpage-header-stage') },
      { key: 'aboutProfileCard', el: document.querySelector('.about-profile-col') },
      { key: 'aboutBio', el: document.querySelector('.about-bio-col') },
      { key: 'aboutSkillsTags', el: document.getElementById('about-skills-tags') },
      { key: 'aboutStats', el: document.getElementById('about-stats-container') },
      { key: 'aboutEducation', el: document.getElementById('about-block-education') || document.querySelector('.about-education-block') },
      { key: 'aboutSoftware', el: document.getElementById('about-block-software') || document.querySelector('.about-software-block') },
      { key: 'aboutLanguages', el: document.getElementById('group-languages') || document.getElementById('about-languages-table') },
      { key: 'aboutTechnical', el: document.getElementById('group-technical') || document.getElementById('about-technical-pills') },
      { key: 'aboutPersonal', el: document.getElementById('group-personal') || document.getElementById('about-personal-pills') },
      { key: 'aboutExperience', el: document.getElementById('group-experience') || document.getElementById('about-experience-list') },
      { key: 'aboutAchievements', el: document.getElementById('group-achievements') || document.getElementById('about-achievements-list') },
      { key: 'aboutCompetitions', el: document.getElementById('group-competitions') || document.getElementById('about-competitions-list') },

      // PROJECTS PAGE SECTIONS
      { key: 'projectsHeader', el: document.querySelector('#view-projects .subpage-header-stage') },
      { key: 'projectsFilterBar', el: document.querySelector('.projects-filter-bar') },
      { key: 'projectsGrid', el: document.getElementById('projects-grouped-stage') },

      // CONTACT PAGE SECTIONS
      { key: 'contactHeader', el: document.querySelector('#view-contact .subpage-header-stage') },
      { key: 'contactStartProject', el: document.querySelector('.contact-callout-top') },
      { key: 'contactChannels', el: document.querySelector('.contact-table-rows') },
      { key: 'contactResumeBtn', el: document.getElementById('contact-resume-action-box') },

      // GLOBAL SECTIONS
      { key: 'siteFooter', el: document.getElementById('site-footer') }
    ];

    sectionElements.forEach(({ key, el }) => {
      if (!el) return;
      let visible = true;
      if (sv[key] === false) visible = false;

      // Check empty / blank content to prevent re-opening empty cells
      if (key === 'homeEmail') {
        const emailVal = (h.emailText !== undefined && h.emailText !== null) ? h.emailText.trim() : (p.email ? p.email.trim() : '');
        if (!emailVal) visible = false;
      }
      if (key === 'homePhone') {
        const phoneVal = (h.phoneText !== undefined && h.phoneText !== null) ? h.phoneText.trim() : (p.phone ? p.phone.trim() : '');
        if (!phoneVal) visible = false;
      }
      if (key === 'homeBehance') {
        const behanceVal = (h.behanceText !== undefined && h.behanceText !== null) ? h.behanceText.trim() : (p.behanceUrl ? p.behanceUrl.trim() : '');
        if (!behanceVal) visible = false;
      }
      if (key === 'homeEnterPortfolio') {
        const enterVal = (h.enterText !== undefined && h.enterText !== null) ? h.enterText.trim() : 'ENTER PORTFOLIO ->';
        if (!enterVal) visible = false;
      }
      if (key === 'contactResumeBtn') {
        const resumeVal = (p.resumeUrl || p.cvUrl || '').trim();
        if (!resumeVal) visible = false;
      }

      // Backward compatible checks with about.sectionSettings & profile.showStats
      if (key === 'aboutStats' && (p.showStats === false || !Array.isArray(p.stats) || p.stats.length === 0)) visible = false;
      if (key === 'aboutEducation' && ((a.sectionSettings && a.sectionSettings.education && a.sectionSettings.education.enabled === false) || (Array.isArray(a.education) && a.education.length === 0))) visible = false;
      if (key === 'aboutSoftware' && ((a.sectionSettings && a.sectionSettings.software && a.sectionSettings.software.enabled === false) || (Array.isArray(a.software) && a.software.length === 0))) visible = false;
      if (key === 'aboutLanguages' && ((a.sectionSettings && a.sectionSettings.languages && a.sectionSettings.languages.enabled === false) || (Array.isArray(a.languages) && a.languages.length === 0))) visible = false;
      if (key === 'aboutTechnical' && ((a.sectionSettings && a.sectionSettings.technicalSkills && a.sectionSettings.technicalSkills.enabled === false) || (Array.isArray(a.technicalSkills) && a.technicalSkills.length === 0))) visible = false;
      if (key === 'aboutPersonal' && ((a.sectionSettings && a.sectionSettings.personalSkills && a.sectionSettings.personalSkills.enabled === false) || (Array.isArray(a.personalSkills) && a.personalSkills.length === 0))) visible = false;
      if (key === 'aboutExperience' && ((a.sectionSettings && a.sectionSettings.experience && a.sectionSettings.experience.enabled === false) || (Array.isArray(a.experience) && a.experience.length === 0))) visible = false;
      if (key === 'aboutAchievements' && ((a.sectionSettings && a.sectionSettings.achievements && a.sectionSettings.achievements.enabled === false) || (Array.isArray(a.achievements) && a.achievements.length === 0))) visible = false;
      if (key === 'aboutCompetitions' && ((a.sectionSettings && a.sectionSettings.competitions && a.sectionSettings.competitions.enabled === false) || (Array.isArray(a.competitions) && a.competitions.length === 0))) visible = false;

      if (!visible) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });

    updateHomeBottomBarLayout();
  }

  function applyPageVisibility() {
    applyPageOrder();
    applySectionVisibility();
    const pv = (portfolioData && portfolioData.pageVisibility) || { home: true, about: true, projects: true, contact: true };

    // 1. Header Nav Tabs
    navTabs.forEach(tab => {
      const viewKey = tab.getAttribute('data-view');
      if (viewKey && pv[viewKey] !== undefined) {
        tab.style.display = pv[viewKey] ? '' : 'none';
      }
    });

    // 2. Mobile Drawer Links
    drawerLinks.forEach(link => {
      const viewKey = link.getAttribute('data-view');
      if (viewKey && pv[viewKey] !== undefined) {
        link.style.display = pv[viewKey] ? '' : 'none';
      }
    });

    // 3. Section Views (Clean inline display overrides)
    pageViews.forEach(view => {
      const vId = view.id.replace('view-', '');
      if (vId && pv[vId] !== undefined) {
        if (!pv[vId]) {
          view.style.display = 'none';
        } else {
          view.style.display = '';
        }
      }
    });

    // 4. Homepage Bottom Bar items if respective page is hidden
    const enterBox = document.getElementById('home-enter-box');
    if (enterBox && pv.projects !== undefined) {
      enterBox.style.display = pv.projects ? '' : 'none';
    }

    // 5. If current active view is hidden, redirect to first visible view
    if (currentActiveViewId && pv[currentActiveViewId] === false) {
      const fallback = getFirstVisibleView(pv);
      window.location.hash = '#' + fallback;
      navigateTo(fallback);
    }
  }

  function handleHashChange() {
    const pv = (portfolioData && portfolioData.pageVisibility) || { home: true, about: true, projects: true, contact: true };
    let hash = window.location.hash.replace('#', '') || 'home';
    if (hash.startsWith('project/')) {
      if (pv.projects === false) {
        const fallback = getFirstVisibleView(pv);
        window.location.hash = '#' + fallback;
        navigateTo(fallback);
        return;
      }
      const projId = hash.split('/')[1];
      navigateTo('project-detail', projId);
    } else if (['home', 'about', 'projects', 'contact'].includes(hash)) {
      if (pv[hash] === false) {
        const fallback = getFirstVisibleView(pv);
        window.location.hash = '#' + fallback;
        navigateTo(fallback);
        return;
      }
      navigateTo(hash);
    } else {
      const fallback = getFirstVisibleView(pv);
      navigateTo(fallback);
    }
  }

  window.addEventListener('hashchange', handleHashChange);

  // Subscribe immediately to real-time database updates from Cloud Firestore & Admin
  if (window.PortfolioDB && window.PortfolioDB.subscribe) {
    window.PortfolioDB.subscribe((newData) => {
      if (!newData) return;
      const prevTime = (portfolioData && portfolioData._lastUpdated) || 0;
      const freshTime = newData._lastUpdated || 0;
      if (portfolioData && prevTime >= freshTime) return; // avoid duplicate renders & flicker
      portfolioData = newData;
      renderAll();
      const hash = window.location.hash.replace('#', '');
      const detailView = document.getElementById('view-project-detail');
      const isDetailActive = detailView && detailView.classList.contains('active');
      if (hash.startsWith('project/')) {
        renderProjectDetail(hash.split('/')[1]);
      } else if (isDetailActive && currentActiveProjectId) {
        renderProjectDetail(currentActiveProjectId);
      }
    });
  }

  // Fast 60ms race to ensure latest IndexedDB data is ready before painting!
  if (window.PortfolioDB && window.PortfolioDB.initPromise) {
    try {
      await Promise.race([
        window.PortfolioDB.initPromise,
        new Promise(res => setTimeout(res, 60))
      ]);
    } catch(e) {}
  }

  portfolioData = (window.PortfolioDB && window.PortfolioDB.getImmediateData)
    ? window.PortfolioDB.getImmediateData()
    : ((window.PortfolioDB && window.PortfolioDB.memoryData) ? window.PortfolioDB.memoryData : null);

  // Synchronously switch to requested view from hash
  handleHashChange();

  // Instant synchronous first-frame render with 100% updated dataset!
  if (portfolioData) {
    try { renderAll(); } catch(e) { console.warn('Instant initial render notice:', e); }
  }

  // Reveal page immediately with updated version - zero flash of old/previous content!
  document.documentElement.classList.remove('anti-fouc');

  // Load database asynchronously without blocking the user
  if (window.PortfolioDB && window.PortfolioDB.getData) {
    window.PortfolioDB.getData().then(freshData => {
      if (freshData) {
        const prevTime = (portfolioData && portfolioData._lastUpdated) || 0;
        const freshTime = freshData._lastUpdated || 0;
        if (freshTime > prevTime || !portfolioData) {
          portfolioData = freshData;
          renderAll();
        }
      }
    }).catch(err => {
      console.warn('Async getData notice:', err);
    });
  }

  // Log visitor count to Firebase if cloud enabled (ignores admin self-views)
  if (window.PortfolioDB && window.PortfolioDB.recordVisit) {
    window.PortfolioDB.recordVisit();
  }

  // Active Filter States
  let activeMainSection = 'all';    // 'all' | 'competition' | 'internship' | 'academic'
  let activeSubLabels = [];         // [] means 'ALL', or ['3D', 'UI/UX'] for multi-select
  let activeLayout = 'grid';        // 'grid' | 'table'
  let searchQuery = '';
  let autoScrollInterval = null;
  let isPageScrolling = false;
  let pageScrollTimeout = null;
  window.addEventListener('scroll', () => {
    isPageScrolling = true;
    clearTimeout(pageScrollTimeout);
    pageScrollTimeout = setTimeout(() => {
      isPageScrolling = false;
    }, 120);
  }, { passive: true });

  /* ================= NAV AUTHENTICATION & EDIT VISIBILITY ================= */
  function updateNavAuthVisibility() {
    try { localStorage.removeItem('renee_admin_authenticated'); } catch(e) {}
    const isAuth = sessionStorage.getItem('renee_admin_authenticated') === 'true';
    const editNavLinks = document.querySelectorAll('.nav-edit-link, .drawer-edit-link');
    editNavLinks.forEach(el => {
      el.style.display = isAuth ? 'inline-flex' : 'none';
    });
    const logoutNavBtns = document.querySelectorAll('.nav-logout-btn, .drawer-logout-btn');
    logoutNavBtns.forEach(el => {
      el.style.display = isAuth ? 'inline-flex' : 'none';
    });
  }

  /* ================= LOGOUT MODAL CONTROLLER (PREVIEW MODE) ================= */
  const siteLogoutModal = document.getElementById('site-logout-modal');
  const siteLogoutConfirmScreen = document.getElementById('site-logout-confirm-screen');
  const siteLogoutSuccessScreen = document.getElementById('site-logout-success-screen');
  const btnSiteLogoutSave = document.getElementById('btn-site-logout-save');
  const btnSiteLogoutDiscard = document.getElementById('btn-site-logout-discard');
  const btnSiteLogoutCancel = document.getElementById('btn-site-logout-cancel');
  const btnSiteLogoutCancelX = document.getElementById('btn-site-logout-cancel-x');

  function openSiteLogoutModal() {
    if (!siteLogoutModal) return;
    if (siteLogoutConfirmScreen) siteLogoutConfirmScreen.style.display = 'block';
    if (siteLogoutSuccessScreen) siteLogoutSuccessScreen.style.display = 'none';
    siteLogoutModal.style.display = 'flex';
    siteLogoutModal.classList.add('active');
  }

  function closeSiteLogoutModal() {
    if (!siteLogoutModal) return;
    siteLogoutModal.style.display = 'none';
    siteLogoutModal.classList.remove('active');
  }

  function performDirectSiteLogout() {
    sessionStorage.removeItem('renee_admin_authenticated');
    localStorage.removeItem('renee_admin_authenticated');
    updateNavAuthVisibility();
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    closeSiteLogoutModal();
    if (window.PortfolioDB && window.PortfolioDB.channel) {
      try { window.PortfolioDB.channel.postMessage({ type: 'AUTH_LOGOUT' }); } catch(e) {}
    }
  }

  async function performSiteLogout(saveChanges) {
    if (saveChanges) {
      if (window.PortfolioDB) {
        await window.PortfolioDB.saveData(portfolioData);
      }
      if (siteLogoutConfirmScreen) siteLogoutConfirmScreen.style.display = 'none';
      if (siteLogoutSuccessScreen) siteLogoutSuccessScreen.style.display = 'block';
      setTimeout(async () => {
        performDirectSiteLogout();
      }, 350);
    } else {
      if (window.PortfolioDB) {
        if (window.PortfolioDB.discardDraft) {
          portfolioData = await window.PortfolioDB.discardDraft();
        } else {
          portfolioData = await window.PortfolioDB.getData();
        }
        renderAll();
      }
      performDirectSiteLogout();
    }
  }

  document.querySelectorAll('.nav-logout-btn, .drawer-logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      const hasDraft = window.PortfolioDB && window.PortfolioDB.hasDraft && window.PortfolioDB.hasDraft();
      if (!hasDraft) {
        performDirectSiteLogout();
        return;
      }
      openSiteLogoutModal();
    });
  });

  if (btnSiteLogoutSave) {
    btnSiteLogoutSave.addEventListener('click', () => performSiteLogout(true));
  }
  if (btnSiteLogoutDiscard) {
    btnSiteLogoutDiscard.addEventListener('click', () => performSiteLogout(false));
  }
  if (btnSiteLogoutCancel) {
    btnSiteLogoutCancel.addEventListener('click', closeSiteLogoutModal);
  }
  if (btnSiteLogoutCancelX) {
    btnSiteLogoutCancelX.addEventListener('click', closeSiteLogoutModal);
  }
  if (siteLogoutModal) {
    siteLogoutModal.addEventListener('click', (e) => {
      if (e.target === siteLogoutModal) closeSiteLogoutModal();
    });
  }

  updateNavAuthVisibility();
  window.addEventListener('focus', updateNavAuthVisibility);
  window.addEventListener('storage', updateNavAuthVisibility);

  /* ================= BLUEPRINT THEME CONTROLLER (COMPASS ICON) ================= */
  const THEME_STORAGE_KEY = 'moo_renee_theme';
  const navThemeToggle = document.getElementById('nav-theme-toggle');
  const drawerThemeBtn = document.getElementById('drawer-theme-btn');

  function applyTheme(themeName) {
    const isNavy = themeName === 'navy';
    document.body.classList.toggle('theme-navy', isNavy);
    document.body.classList.toggle('blue-mode', isNavy);
    if (isNavy) {
      document.documentElement.setAttribute('data-theme', 'navy');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (drawerThemeBtn) {
      drawerThemeBtn.innerHTML = isNavy ? '<span>✦</span> Default Warm Theme' : '<span>✦</span> Switch Blue Theme';
    }
    if (navThemeToggle) {
      navThemeToggle.setAttribute('aria-pressed', isNavy ? 'true' : 'false');
      navThemeToggle.setAttribute('title', isNavy ? 'Switch to Default Warm Theme' : 'Switch to Blueprint Navy Blue Theme');
    }
  }

  function toggleTheme() {
    const currentTheme = sessionStorage.getItem(THEME_STORAGE_KEY) === 'navy' ? 'navy' : 'default';
    const nextTheme = currentTheme === 'navy' ? 'default' : 'navy';
    try {
      sessionStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      // Clean up legacy localStorage so new sessions always start in default mode
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch(e) {}
    applyTheme(nextTheme);
  }

  // User requested: Closing tab and entering again will always start in default mode
  try { localStorage.removeItem(THEME_STORAGE_KEY); } catch(e) {}
  const savedTheme = sessionStorage.getItem(THEME_STORAGE_KEY) || 'default';
  applyTheme(savedTheme);

  if (navThemeToggle) navThemeToggle.addEventListener('click', toggleTheme);
  if (drawerThemeBtn) drawerThemeBtn.addEventListener('click', toggleTheme);

  if (window.PortfolioDB && window.PortfolioDB.channel) {
    try {
      window.PortfolioDB.channel.addEventListener('message', async (ev) => {
        if (ev.data && (ev.data.type === 'AUTH_LOGIN' || ev.data.type === 'AUTH_LOGOUT')) {
          updateNavAuthVisibility();
          if (ev.data.type === 'AUTH_LOGOUT') {
            portfolioData = await window.PortfolioDB.getData();
            renderAll();
          }
        }
      });
    } catch(e) {}
  }

  

  // Mobile drawer controls
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      if (mobileDrawer) mobileDrawer.classList.add('open');
    });
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', () => {
      if (mobileDrawer) mobileDrawer.classList.remove('open');
    });
  }

  /* ================= 2. VIEW 1: HOME PAGE LOGIC ================= */
  function renderHomeScreen() {
    const p = portfolioData.profile || {};
    const h = portfolioData.home || {};
    
    // Top Brand & Footer
    const brandLink = document.getElementById('header-brand-link');
    if (brandLink) {
      brandLink.innerHTML = `
        <span class="mono-line"><span class="secret-p-trigger" id="brand-p-trigger">P</span>ORTFOLIO</span>
        <span class="mono-line">${p.years || '2024–26'}</span>
      `;
    }

    // Hero "DES. BY" Label
    const desByLabel = document.getElementById('home-des-by-label');
    if (desByLabel) {
      desByLabel.textContent = h.desByLabel || 'DES. BY';
    }

    // Hero Designer Name (Moo Renee)
    const designerNameEl = document.getElementById('home-designer-name');
    if (designerNameEl) {
      const name = h.designerName || p.name || 'MOO RENEE';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        designerNameEl.innerHTML = `<span class="d-line">${parts[0]}</span><span class="d-line">${parts.slice(1).join(' ')}</span>`;
      } else {
        designerNameEl.textContent = name;
      }
    }

    // Hero Discipline Subtitle (e.g. INTERACTIVE SPATIAL DESIGN / TAYLOR'S UNIVERSITY)
    const disciplineSub = document.getElementById('home-discipline-sub');
    if (disciplineSub) {
      if (h.disciplineSub) {
        disciplineSub.innerHTML = h.disciplineSub.replace(/\n/g, '<br />');
      } else {
        disciplineSub.innerHTML = `INTERACTIVE SPATIAL<br />DESIGN<br />${p.institution || "TAYLOR'S UNIVERSITY"}`;
      }
    }

    // Hero Copyright (e.g. ©2026)
    const copyrightEl = document.getElementById('home-copyright-text');
    if (copyrightEl) {
      copyrightEl.textContent = h.copyrightText || '©2026';
    }

    // Hero Right Column Discipline
    const rightDisc = document.getElementById('home-right-discipline');
    if (rightDisc) rightDisc.textContent = (h.rightDiscipline || p.degree || 'INTERACTIVE SPATIAL DESIGN').toUpperCase();

    // Hero Right Column Years
    const rightYears = document.getElementById('home-right-years');
    if (rightYears) rightYears.innerHTML = (h.rightYears || p.years || '2024 &mdash; 2026').replace('-', '&mdash;');

    // Bottom info bar cells (Matching Image 1) - All optional (Hide if empty)
    const emailCell = document.getElementById('home-email-text');
    const phoneCell = document.getElementById('home-phone-text');
    const behanceCell = document.getElementById('home-behance-text');
    const enterLink = document.getElementById('home-enter-link');
    const enterText = document.getElementById('home-enter-text');

    const emailBox = document.getElementById('home-email-box') || (emailCell ? emailCell.closest('.bottom-cell') : null);
    const phoneBox = document.getElementById('home-phone-box') || (phoneCell ? phoneCell.closest('.bottom-cell') : null);
    const behanceBox = document.getElementById('home-behance-box') || (behanceCell ? behanceCell.closest('.bottom-cell') : null);
    const enterBox = document.getElementById('home-enter-box') || (enterLink ? enterLink.closest('.bottom-cell') : null);

    // 1. Email (Optional)
    let emailVal = '';
    if (h.emailText !== undefined && h.emailText !== null) {
      emailVal = h.emailText.trim();
    } else if (p.email) {
      emailVal = p.email.trim();
    }
    if (!p.email && emailVal.toUpperCase().includes('MOORENEE481@GMAIL.COM')) {
      emailVal = '';
    }

    if (emailVal) {
      if (emailBox) emailBox.style.display = 'flex';
      if (emailCell) {
        const cleanEmail = emailVal.replace(/^[-—\s]+/, '').toUpperCase();
        emailCell.textContent = cleanEmail;
        emailCell.href = h.emailUrl || `mailto:${emailVal.replace(/^[-—\s]+/, '')}`;
      }
    } else {
      if (emailBox) emailBox.style.display = 'none';
    }

    // 2. Phone (Optional)
    let phoneVal = '';
    if (h.phoneText !== undefined && h.phoneText !== null) {
      phoneVal = h.phoneText.trim();
    } else if (p.phone) {
      phoneVal = p.phone.trim();
    }
    if (!p.phone && phoneVal.includes('10-3687393')) {
      phoneVal = '';
    }

    if (phoneVal) {
      if (phoneBox) phoneBox.style.display = 'flex';
      if (phoneCell) {
        phoneCell.textContent = phoneVal;
        phoneCell.href = h.phoneUrl || `tel:${phoneVal.replace(/[^0-9+]/g, '')}`;
      }
    } else {
      if (phoneBox) phoneBox.style.display = 'none';
    }

    // 3. Behance (Optional)
    let behanceVal = '';
    if (h.behanceText !== undefined && h.behanceText !== null) {
      behanceVal = h.behanceText.trim();
    } else if (p.behanceUrl) {
      behanceVal = p.behanceUrl.trim();
    }
    if (!p.behanceUrl && behanceVal.toLowerCase().includes('reneemoo')) {
      behanceVal = '';
    }

    if (behanceVal) {
      if (behanceBox) behanceBox.style.display = 'flex';
      if (behanceCell) {
        behanceCell.textContent = behanceVal.replace(/^https?:\/\//i, '').toUpperCase();
        behanceCell.href = h.behanceUrl || (behanceVal.startsWith('http') ? behanceVal : `https://${behanceVal}`);
      }
    } else {
      if (behanceBox) behanceBox.style.display = 'none';
    }

    // 4. Enter Portfolio link
    const enterVal = (h.enterText !== undefined && h.enterText !== null) ? h.enterText.trim() : 'ENTER PORTFOLIO ->';
    if (enterVal) {
      if (enterBox) enterBox.style.display = 'flex';
      if (enterText) {
        const cleanEnter = enterVal.replace(/^[-—\s]+/, '').replace(/->$/, '→').trim();
        enterText.textContent = cleanEnter.endsWith('→') || cleanEnter.endsWith('&rarr;') ? cleanEnter : `${cleanEnter} \u2192`;
      }
      if (enterLink && h.enterUrl) {
        enterLink.href = h.enterUrl;
      }
    } else {
      if (enterBox) enterBox.style.display = 'none';
    }

    // Adjust bottom bar columns dynamically based on visible cells
    updateHomeBottomBarLayout();

    // Make entire bottom-bar columns clickable (e.g. clicking anywhere in the column enters portfolio / activates link)
    const allBottomCells = document.querySelectorAll('.home-bottom-grid-bar .bottom-cell');
    allBottomCells.forEach(cell => {
      if (!cell._hasColumnClickHandler) {
        cell._hasColumnClickHandler = true;
        cell.addEventListener('click', (e) => {
          if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('a') === cell.querySelector('a')) {
            return;
          }
          const a = cell.querySelector('a');
          if (a) {
            if (a.getAttribute('target') === '_blank') {
              window.open(a.href, '_blank', 'noopener,noreferrer');
            } else if (a.hash && a.hash.startsWith('#')) {
              window.location.hash = a.hash;
            } else if (a.href) {
              a.click();
            }
          }
        });
      }
    });

    // Global Footer texts
    const footerLeft = document.getElementById('footer-left-text');
    if (footerLeft) footerLeft.innerHTML = `${p.name || 'MOO RENEE'} &bull; <span class="secret-p-trigger">P</span>ORTFOLIO ${p.years || '2024–26'}`;

    const footerRight = document.getElementById('footer-right-text');
    if (footerRight) footerRight.innerHTML = `${p.institution || "TAYLOR'S UNIVERSITY"} &bull; KUALA LUMPUR`;
  }

  /* ================= 3. VIEW 2: ABOUT PAGE LOGIC ================= */
  function renderAboutScreen() {
    const p = portfolioData.profile || {};
    const a = portfolioData.about || {};
    const defAbout = (window.DEFAULT_PORTFOLIO_DATA && window.DEFAULT_PORTFOLIO_DATA.about) || {};
    const defProf = (window.DEFAULT_PORTFOLIO_DATA && window.DEFAULT_PORTFOLIO_DATA.profile) || {};

    const statsListItems = (Array.isArray(p.stats))
      ? p.stats
      : (defProf.stats || []);

    const eduListItems = (Array.isArray(a.education))
      ? a.education
      : (defAbout.education || []);

    const techSkillsList = (Array.isArray(a.technicalSkills))
      ? a.technicalSkills
      : (defAbout.technicalSkills || []);

    const persSkillsList = (Array.isArray(a.personalSkills))
      ? a.personalSkills
      : (defAbout.personalSkills || []);

    const langListItems = (Array.isArray(a.languages))
      ? a.languages
      : (defAbout.languages || []);

    const expListItems = (Array.isArray(a.experience))
      ? a.experience
      : (defAbout.experience || []);

    const achListItems = (Array.isArray(a.achievements))
      ? a.achievements
      : (defAbout.achievements || []);

    const compListItems = (Array.isArray(a.competitions))
      ? a.competitions
      : (defAbout.competitions || []);

    // Headline
    const headlineEl = document.getElementById('about-headline-title');
    if (headlineEl && p.headline) {
      headlineEl.innerHTML = p.headline.replace(/\n/g, '<br />');
    }

    // Bio paragraph
    const bioEl = document.getElementById('about-bio-text');
    if (bioEl) bioEl.textContent = p.shortBio || '';

    // Skills pill tags in upper section
    const tagsRow = document.getElementById('about-skills-tags');
    if (tagsRow) {
      tagsRow.innerHTML = '';
      const tags = p.tags || ["UI/UX", "AR/VR", "GAME DESIGN", "3D MODELING", "PROJECTION MAPPING", "ILLUSTRATION"];
      tags.forEach(t => {
        const pill = document.createElement('span');
        pill.className = 'pill-tag';
        pill.textContent = t;
        tagsRow.appendChild(pill);
      });
    }

    // Profile card
    const portraitImg = document.getElementById('about-portrait-img');
    if (portraitImg) portraitImg.src = p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

    const profileName = document.getElementById('about-profile-name');
    if (profileName) profileName.textContent = p.name || 'MOO RENEE';

    // Phone (Optional - hide if blank)
    const phoneEntry = document.getElementById('about-phone-entry');
    if (phoneEntry) {
      const phoneVal = (p.phone || '').trim();
      if (phoneVal) {
        phoneEntry.style.display = '';
        phoneEntry.textContent = phoneVal;
      } else {
        phoneEntry.style.display = 'none';
      }
    }

    // Email (Optional - hide if blank)
    const emailEntry = document.getElementById('about-email-entry');
    if (emailEntry) {
      const emailVal = (p.email || '').trim();
      if (emailVal) {
        emailEntry.style.display = '';
        emailEntry.textContent = emailVal.toUpperCase();
      } else {
        emailEntry.style.display = 'none';
      }
    }

    // Behance (Optional - hide if blank)
    const behanceEntry = document.getElementById('about-behance-entry');
    const behanceWrap = document.getElementById('about-behance-wrap') || (behanceEntry ? behanceEntry.closest('.contact-entry') : null);
    if (behanceWrap) {
      const url = (p.behanceUrl || '').trim();
      if (url) {
        behanceWrap.style.display = '';
        if (behanceEntry) {
          behanceEntry.href = url.startsWith('http') ? url : `https://${url}`;
          behanceEntry.textContent = url.replace(/^https?:\/\//i, '').replace(/\/$/, '').toUpperCase();
        }
      } else {
        behanceWrap.style.display = 'none';
      }
    }

    // Linktree (Optional - hide if blank)
    const linktreeEntry = document.getElementById('about-linktree-entry');
    const linktreeWrap = document.getElementById('about-linktree-wrap') || (linktreeEntry ? linktreeEntry.closest('.contact-entry') : null);
    if (linktreeWrap) {
      const url = (p.linktreeUrl || '').trim();
      if (url) {
        linktreeWrap.style.display = '';
        if (linktreeEntry) {
          linktreeEntry.href = url.startsWith('http') ? url : `https://${url}`;
          linktreeEntry.textContent = url.replace(/^https?:\/\//i, '').replace(/\/$/, '').toUpperCase();
        }
      } else {
        linktreeWrap.style.display = 'none';
      }
    }

    // Helper for clean architectural section titles allowing full custom renaming
    function getCleanHeading(colKey, rawTitle, defaultClean) {
      if (a.columnTitles && a.columnTitles[colKey] && a.columnTitles[colKey].trim()) {
        return a.columnTitles[colKey].trim().toUpperCase();
      }
      if (rawTitle && rawTitle.trim()) {
        return rawTitle.replace(/^\d+\s*[•\-\/]\s*/, '').trim().toUpperCase();
      }
      return defaultClean;
    }

    // Education checklist (Matching reference image)
    const eduBlock = document.getElementById('about-block-education') || document.querySelector('.about-education-block');
    const secEdu = a.sectionSettings && a.sectionSettings.education;
    if (eduBlock) {
      if ((secEdu && secEdu.enabled === false) || eduListItems.length === 0) {
        eduBlock.style.display = 'none';
      } else {
        eduBlock.style.display = 'block';
        const miniTitle = eduBlock.querySelector('.block-mini-title');
        if (miniTitle) miniTitle.textContent = getCleanHeading('education', secEdu && secEdu.title, 'EDUCATION');
      }
    }
    const eduList = document.getElementById('about-education-list');
    if (eduList) {
      eduList.innerHTML = '';
      eduListItems.forEach(edu => {
        const item = document.createElement('div');
        item.className = 'edu-card-item';
        
        const yearsText = (edu.years || '').replace(/\s*-\s*/, '-');
        let cgpaText = (edu.cgpa || '').trim();
        if (cgpaText && !cgpaText.toUpperCase().startsWith('CGPA')) {
          cgpaText = 'CGPA ' + cgpaText;
        }

        item.innerHTML = `
          <div class="edu-year-col">${yearsText}</div>
          <div class="edu-details-col">
            <span class="edu-title-text">${edu.title || ''}</span>
            ${edu.subtitle ? `<span class="edu-sub-text">${edu.subtitle}</span>` : ''}
            ${cgpaText ? `<span class="edu-cgpa-text">${cgpaText}</span>` : ''}
          </div>
        `;
        eduList.appendChild(item);
      });
    }

    // Software grid
    const softBlock = document.getElementById('about-block-software') || document.querySelector('.about-software-block');
    const secSoft = a.sectionSettings && a.sectionSettings.software;
    const softwares = (Array.isArray(a.software)) ? a.software : (defAbout.software || []);
    if (softBlock) {
      if ((secSoft && secSoft.enabled === false) || softwares.length === 0) {
        softBlock.style.display = 'none';
      } else {
        softBlock.style.display = 'block';
        const miniTitle = softBlock.querySelector('.block-mini-title');
        if (miniTitle) miniTitle.textContent = getCleanHeading('software', secSoft && secSoft.title, 'SOFTWARE');
      }
    }
    const softGrid = document.getElementById('about-software-grid');
    if (softGrid) {
      softGrid.innerHTML = '';
      softwares.forEach((s, idx) => {
        const box = document.createElement('div');
        box.className = 'software-square-box';
        box.style.setProperty('--tile-idx', idx);
        const displayName = s.name || s.code || '';
        box.setAttribute('data-name', displayName);
        box.setAttribute('title', displayName);

        if (s.image) {
          box.innerHTML = `
            <img src="${s.image}" alt="${displayName}" class="software-tile-img" />
            <span class="software-hover-tooltip">${displayName}</span>
          `;
        } else {
          const codeText = s.code || (s.name ? s.name.slice(0, 2).toUpperCase() : '');
          box.innerHTML = `
            <span class="software-code-text">${codeText}</span>
            <span class="software-hover-tooltip">${displayName}</span>
          `;
        }
        softGrid.appendChild(box);
      });
    }

    // Stats Grid (Optional & 100% Manually Keyed In by User)
    const statsContainer = document.getElementById('about-stats-container');
    if (statsContainer) {
      const isStatsVisible = p.showStats !== false;
      if (!isStatsVisible || statsListItems.length === 0) {
        statsContainer.style.display = 'none';
      } else {
        statsContainer.style.display = '';
        statsContainer.innerHTML = '';
        const statsCount = statsListItems.length || 4;
        const preferredLayout = p.statsLayout || 'beside';

        if (preferredLayout === 'box' || statsCount > 6) {
          statsContainer.classList.add('stats-boxed-grid');
          statsContainer.classList.remove('stats-beside-grid');
          statsContainer.style.removeProperty('--stats-col-count');
        } else {
          statsContainer.classList.remove('stats-boxed-grid');
          statsContainer.classList.add('stats-beside-grid');
          statsContainer.style.setProperty('--stats-col-count', statsCount);
        }

        statsListItems.forEach(st => {
          const displayNum = (st.number !== undefined && st.number !== null) ? String(st.number) : '';
          const displayLabel = st.label || '';
          const cell = document.createElement('div');
          cell.className = 'stat-cell';
          cell.innerHTML = `
            <span class="stat-number">${displayNum}</span>
            <span class="stat-label">${displayLabel}</span>
          `;
          statsContainer.appendChild(cell);
        });
      }
    }

    // Lower Matrix: Technical Skills (Column 1)
    const groupTech = document.getElementById('group-technical') || (document.getElementById('about-technical-pills') ? document.getElementById('about-technical-pills').closest('.matrix-section-group') : null);
    const techPills = document.getElementById('about-technical-pills');
    const secTech = a.sectionSettings && a.sectionSettings.technicalSkills;
    if (techPills) {
      const heading = groupTech ? groupTech.querySelector('.matrix-subheading') : techPills.previousElementSibling;
      if ((secTech && secTech.enabled === false) || techSkillsList.length === 0) {
        if (groupTech) groupTech.style.display = 'none';
        else {
          techPills.style.display = 'none';
          if (heading) heading.style.display = 'none';
        }
      } else {
        if (groupTech) groupTech.style.display = 'flex';
        techPills.style.display = 'flex';
        if (heading) {
          heading.style.display = 'block';
          heading.textContent = getCleanHeading('technical', secTech && secTech.title, 'TECHNICAL');
        }
        techPills.innerHTML = '';
        techSkillsList.forEach(sk => {
          const pill = document.createElement('span');
          pill.className = 'matrix-outline-pill';
          pill.textContent = sk;
          techPills.appendChild(pill);
        });
      }
    }

    // Personal Skills (Column 1)
    const groupPers = document.getElementById('group-personal') || (document.getElementById('about-personal-pills') ? document.getElementById('about-personal-pills').closest('.matrix-section-group') : null);
    const persPills = document.getElementById('about-personal-pills');
    const secPers = a.sectionSettings && a.sectionSettings.personalSkills;
    if (persPills) {
      const heading = groupPers ? groupPers.querySelector('.matrix-subheading') : persPills.previousElementSibling;
      if ((secPers && secPers.enabled === false) || persSkillsList.length === 0) {
        if (groupPers) groupPers.style.display = 'none';
        else {
          persPills.style.display = 'none';
          if (heading) heading.style.display = 'none';
        }
      } else {
        if (groupPers) groupPers.style.display = 'flex';
        persPills.style.display = 'flex';
        if (heading) {
          heading.style.display = 'block';
          heading.textContent = getCleanHeading('personal', secPers && secPers.title, 'PERSONAL');
        }
        persPills.innerHTML = '';
        persSkillsList.forEach(sk => {
          const pill = document.createElement('span');
          pill.className = 'matrix-outline-pill';
          pill.textContent = sk;
          persPills.appendChild(pill);
        });
      }
    }

    // Languages (Upper Section alongside Software / Education)
    const groupLang = document.getElementById('group-languages') || (document.getElementById('about-languages-table') ? document.getElementById('about-languages-table').closest('.matrix-section-group, .about-language-block') : null);
    const langTable = document.getElementById('about-languages-table');
    const secLang = a.sectionSettings && a.sectionSettings.languages;
    if (langTable) {
      const heading = groupLang ? groupLang.querySelector('.matrix-subheading, .block-mini-title') : langTable.previousElementSibling;
      if ((secLang && secLang.enabled === false) || langListItems.length === 0) {
        if (groupLang) groupLang.style.display = 'none';
        else {
          langTable.style.display = 'none';
          if (heading) heading.style.display = 'none';
        }
      } else {
        if (groupLang) groupLang.style.display = 'block';
        langTable.style.display = 'flex';
        if (heading) {
          heading.style.display = 'block';
          heading.textContent = getCleanHeading('languages', secLang && secLang.title, 'LANGUAGE');
        }
        langTable.innerHTML = '';
        langListItems.forEach(l => {
          const row = document.createElement('div');
          row.className = 'matrix-lang-row';
          row.innerHTML = `
            <span>${l.language}</span>
            <span class="matrix-lang-level">${l.proficiency}</span>
          `;
          langTable.appendChild(row);
        });
      }
    }

    // Experience (Column 2)
    const groupExp = document.getElementById('group-experience') || (document.getElementById('about-experience-list') ? document.getElementById('about-experience-list').closest('.matrix-section-group') : null);
    const expList = document.getElementById('about-experience-list');
    const secExp = a.sectionSettings && a.sectionSettings.experience;
    if (expList) {
      const heading = groupExp ? groupExp.querySelector('.matrix-subheading') : expList.previousElementSibling;
      if ((secExp && secExp.enabled === false) || expListItems.length === 0) {
        if (groupExp) groupExp.style.display = 'none';
        else {
          expList.style.display = 'none';
          if (heading) heading.style.display = 'none';
        }
      } else {
        if (groupExp) groupExp.style.display = 'flex';
        expList.style.display = 'flex';
        if (heading) {
          heading.style.display = 'block';
          heading.textContent = getCleanHeading('experience', secExp && secExp.title, 'EXPERIENCE');
        }
        expList.innerHTML = '';
        expListItems.forEach(exp => {
          const item = document.createElement('div');
          item.className = 'matrix-exp-item';
          item.innerHTML = `
            <span class="exp-badge-type">${exp.type || 'EXPERIENCE'}</span>
            <span class="exp-company-title">${exp.company || ''}</span>
            ${exp.role ? `<span class="exp-role-text">${exp.role}</span>` : ''}
          `;
          expList.appendChild(item);
        });
      }
    }

    // Achievements (Column 2)
    const groupAch = document.getElementById('group-achievements') || (document.getElementById('about-achievements-list') ? document.getElementById('about-achievements-list').closest('.matrix-section-group') : null);
    const achList = document.getElementById('about-achievements-list');
    const secAch = a.sectionSettings && a.sectionSettings.achievements;
    if (achList) {
      const heading = groupAch ? groupAch.querySelector('.matrix-subheading') : achList.previousElementSibling;
      if ((secAch && secAch.enabled === false) || achListItems.length === 0) {
        if (groupAch) groupAch.style.display = 'none';
        else {
          achList.style.display = 'none';
          if (heading) heading.style.display = 'none';
        }
      } else {
        if (groupAch) groupAch.style.display = 'flex';
        achList.style.display = 'flex';
        if (heading) {
          heading.style.display = 'block';
          heading.textContent = getCleanHeading('achievements', secAch && secAch.title, 'ACHIEVEMENTS');
        }
        achList.innerHTML = '';
        achListItems.forEach(ach => {
          const item = document.createElement('div');
          item.className = 'matrix-achieve-item';
          item.innerHTML = `
            <span class="achieve-title">${ach.title}</span>
            <span class="achieve-award">${ach.award || 'HONOR'}</span>
          `;
          achList.appendChild(item);
        });
      }
    }

    // Competitions & Extracurricular (Column 3)
    const groupComp = document.getElementById('group-competitions') || (document.getElementById('about-competitions-list') ? document.getElementById('about-competitions-list').closest('.matrix-section-group') : null);
    const compList = document.getElementById('about-competitions-list');
    const secComp = a.sectionSettings && a.sectionSettings.competitions;
    if (compList) {
      const heading = groupComp ? groupComp.querySelector('.matrix-subheading') : compList.previousElementSibling;
      if ((secComp && secComp.enabled === false) || compListItems.length === 0) {
        if (groupComp) groupComp.style.display = 'none';
        else {
          compList.style.display = 'none';
          if (heading) heading.style.display = 'none';
        }
      } else {
        if (groupComp) groupComp.style.display = 'flex';
        compList.style.display = 'flex';
        if (heading) {
          heading.style.display = 'block';
          heading.textContent = getCleanHeading('competitions', secComp && secComp.title, 'COMPETITIONS & EXTRACURRICULAR');
        }
        compList.innerHTML = '';
        compListItems.forEach(c => {
          const item = document.createElement('div');
          item.className = 'matrix-comp-item';
          item.innerHTML = `
            <span class="comp-year">${c.year}</span>
            <span class="comp-name">${c.name}</span>
          `;
          compList.appendChild(item);
        });
      }
    }

    // Render Custom About Sections (Column 1 to 4 + Auto Grid Rows)
    document.querySelectorAll('.dynamic-about-custom-block').forEach(el => el.remove());
    const customGridRow = document.getElementById('about-custom-matrix-row');
    if (customGridRow) customGridRow.innerHTML = '';

    const customSecs = Array.isArray(a.customSections) ? a.customSections : [];
    // If multiple sections are all set to column 4 (legacy default), automatically distribute them into the balanced row
    const allCol4 = customSecs.length > 1 && customSecs.every(cs => cs.column === 4 || cs.column === '4');

    customSecs.forEach((cs, idx) => {
      let targetContainer = null;
      let colVal = cs.column;

      // If set to auto, or all were legacy col 4, flow into dedicated custom grid row
      if (allCol4 || !colVal || colVal === 'auto' || colVal === 'grid') {
        if (customGridRow) {
          targetContainer = customGridRow;
        } else {
          const colNum = (idx % 4) + 1;
          targetContainer = document.getElementById(`matrix-col-${colNum}`) || document.getElementById('matrix-col-1');
        }
      } else {
        const colNum = parseInt(colVal, 10);
        targetContainer = document.getElementById(`matrix-col-${colNum}`) || (customGridRow || document.getElementById('matrix-col-4'));
      }

      if (targetContainer) {
        const wrap = document.createElement('div');
        wrap.className = 'dynamic-about-custom-block matrix-section-group';
        wrap.setAttribute('data-style', cs.style || 'timeline');
        wrap.style.marginTop = '0px';
        wrap.style.alignSelf = 'start';
        wrap.style.verticalAlign = 'top';

        const title = (cs.title || 'SECTION').toUpperCase();
        const style = cs.style || 'timeline';
        let contentHtml = '';

        if (style === 'pills') {
          // Pill tags style (like skills)
          const pillsHtml = (cs.items || []).map(it => `
            <span class="pill-tag">${it.title || it.subtitle || ''}</span>
          `).join('');
          contentHtml = `
            <div class="matrix-subheading">${title}</div>
            <div class="matrix-pills-wrap" style="flex-direction:row; flex-wrap:wrap; gap:0.5rem;">${pillsHtml}</div>
          `;
        } else if (style === 'cards') {
          // Experience card style
          const cardsHtml = (cs.items || []).map(it => `
            <div class="custom-card-entry">
              <div class="custom-card-header">
                <span class="custom-card-title">${it.title || ''}</span>
                ${it.subtitle ? `<span class="custom-card-meta">${it.subtitle}</span>` : ''}
              </div>
              ${it.description ? `<p class="custom-card-desc">${it.description}</p>` : ''}
            </div>
          `).join('');
          contentHtml = `
            <div class="matrix-subheading">${title}</div>
            <div class="custom-cards-stack">${cardsHtml}</div>
          `;
        } else if (style === 'awards') {
          // Distinction list style
          const awardsHtml = (cs.items || []).map(it => `
            <div class="matrix-achieve-item">
              <span class="achieve-title">${it.title || ''}</span>
              ${it.subtitle ? `<span class="achieve-org">${it.subtitle}</span>` : ''}
            </div>
          `).join('');
          contentHtml = `
            <div class="matrix-subheading">${title}</div>
            <div class="matrix-achieve-list">${awardsHtml}</div>
          `;
        } else if (style === 'narrative') {
          // Narrative block style
          const narrativeHtml = (cs.items || []).map(it => `
            <div class="custom-narrative-block">
              ${it.title ? `<div class="custom-narrative-sub">${it.title}</div>` : ''}
              <p class="detail-full-desc" style="white-space: pre-line;">${it.description || it.subtitle || ''}</p>
            </div>
          `).join('');
          contentHtml = `
            <div class="matrix-subheading">${title}</div>
            <div class="custom-narrative-wrap">${narrativeHtml}</div>
          `;
        } else {
          // Default: Timeline / Competitions list style
          const compHtml = (cs.items || []).map(it => `
            <div class="matrix-comp-item">
              ${it.subtitle ? `<span class="comp-year">${it.subtitle}</span>` : ''}
              <span class="comp-name">${it.title || ''}</span>
              ${it.description ? `<p class="comp-desc" style="font-family:var(--font-mono);font-size:0.75rem;color:#666;margin:4px 0 0 0;">${it.description}</p>` : ''}
            </div>
          `).join('');
          contentHtml = `
            <div class="matrix-subheading">${title}</div>
            <div class="matrix-comp-list">${compHtml}</div>
          `;
        }

        wrap.innerHTML = contentHtml;
        targetContainer.appendChild(wrap);
      }
    });

    if (customGridRow) {
      customGridRow.style.display = customGridRow.children.length > 0 ? 'grid' : 'none';
    }

    // CONTENTS (Dynamic Projects Table of Contents in Column 4)
    const tocList = document.getElementById('about-toc-list');
    if (tocList) {
      tocList.innerHTML = '';
      const projs = portfolioData.projects || [];
      const defaultGroups = [
        { label: 'ACADEMIC', category: 'academic' },
        { label: 'COMPETITION', category: 'competition' },
        { label: 'INTERNSHIP', category: 'internship' }
      ];
      const sections = (portfolioData.projectSections && portfolioData.projectSections.length > 0)
        ? portfolioData.projectSections.map(s => ({
            label: s.title.replace(/\s+PROJECTS$/i, '').toUpperCase(),
            category: s.key.toLowerCase()
          }))
        : defaultGroups;

      sections.forEach(g => {
        const groupProjs = projs.filter(p => {
          if (Array.isArray(p.categories) && p.categories.length > 0) {
            return p.categories.some(c => c.toLowerCase() === g.category);
          }
          return (p.category || 'academic').toLowerCase() === g.category;
        });

        if (groupProjs.length > 0) {
          const groupWrap = document.createElement('div');
          groupWrap.className = 'toc-group-block';
          groupWrap.innerHTML = `<div class="toc-group-title">${g.label}</div>`;

          const stack = document.createElement('div');
          stack.className = 'toc-items-stack';

          groupProjs.forEach(p => {
            const discList = (Array.isArray(p.disciplines) && p.disciplines.length > 0)
              ? p.disciplines
              : (p.discipline ? p.discipline.split(/[•,/]+/).map(s => s.trim()) : [p.tag || 'PROJECT']);
            // Use primary discipline for concise architectural layout
            const primaryDisc = discList[0] || p.tag || '';
            const discPrefix = primaryDisc ? `${primaryDisc} — ` : '';
            const link = document.createElement('a');
            link.className = 'toc-item-link';
            link.href = `#project/${p.id}`;
            link.innerHTML = `
              <span class="toc-number">${p.index || '01'}</span>
              <span class="toc-text">${discPrefix}${p.title}</span>
            `;
            link.addEventListener('click', (e) => {
              e.preventDefault();
              window.location.hash = `project/${p.id}`;
            });
            stack.appendChild(link);
          });

          groupWrap.appendChild(stack);
          tocList.appendChild(groupWrap);
        }
      });
    }
  }

  /* ================= 4. VIEW 3: PROJECTS PAGE LOGIC ================= */
  const projectsGroupedStage = document.getElementById('projects-grouped-stage');
  const projectsUnifiedGrid = document.getElementById('projects-unified-grid');
  const projectsSpecTableStage = document.getElementById('projects-spec-table-stage');
  const specTableBody = document.getElementById('spec-table-body');
  const secPillBtns = document.querySelectorAll('.sec-pill-btn');
  const discPillBtns = document.querySelectorAll('.disc-pill-btn');
  const searchInput = document.getElementById('project-search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const resetFilterBtn = document.getElementById('reset-filter-btn');
  const layoutToggleBtns = document.querySelectorAll('.layout-toggle-btn');

  // Helper: Normalize and retrieve project's Main Section (COMPETITION / INTERNSHIP / ACADEMIC)
  function getProjectMainSection(p) {
    const raw = (p.mainSection || p.category || (p.categories && p.categories[0]) || 'academic').toUpperCase();
    if (raw.includes('COMPET')) return 'COMPETITION';
    if (raw.includes('INTERN')) return 'INTERNSHIP';
    return 'ACADEMIC';
  }

  // Helper: Normalize and retrieve project's Sub-Labels (e.g. ILLUSTRATION, 3D, UI/UX, INSTALLATION)
  function getProjectSubLabels(p) {
    if (Array.isArray(p.subLabels) && p.subLabels.length > 0) {
      return p.subLabels;
    }
    if (Array.isArray(p.disciplines) && p.disciplines.length > 0) {
      return p.disciplines;
    }
    if (p.discipline) {
      return p.discipline.split(/[•,/]+/).map(s => s.trim()).filter(Boolean);
    }
    return [p.tag || 'PROJECT'];
  }

  function buildFilterPills() {
    const secRow = document.getElementById('section-pills-row');
    if (secRow) {
      secRow.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.className = `sec-pill-btn ${activeMainSection === 'all' ? 'active' : ''}`;
      allBtn.setAttribute('data-section', 'all');
      allBtn.innerHTML = `ALL SECTIONS <span class="count">${(portfolioData.projects || []).length.toString().padStart(2, '0')}</span>`;
      allBtn.addEventListener('click', () => {
        activeMainSection = 'all';
        renderProjectsCatalog();
      });
      secRow.appendChild(allBtn);

      const mainCats = portfolioData.mainCategories || ['COMPETITION', 'INTERNSHIP', 'ACADEMIC'];
      mainCats.forEach(cat => {
        const catKey = cat.toLowerCase();
        const cnt = (portfolioData.projects || []).filter(p => getProjectMainSection(p).toLowerCase() === catKey).length;
        const btn = document.createElement('button');
        btn.className = `sec-pill-btn ${activeMainSection === catKey ? 'active' : ''}`;
        btn.setAttribute('data-section', catKey);
        btn.innerHTML = `${cat} <span class="count">${cnt.toString().padStart(2, '0')}</span>`;
        btn.addEventListener('click', () => {
          activeMainSection = (activeMainSection === catKey) ? 'all' : catKey;
          renderProjectsCatalog();
        });
        secRow.appendChild(btn);
      });
    }

    const discRow = document.getElementById('disc-pills-row');
    if (discRow) {
      discRow.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.className = `disc-pill-btn ${activeSubLabels.length === 0 ? 'active' : ''}`;
      allBtn.setAttribute('data-sublabel', 'all');
      allBtn.innerHTML = `ALL <span class="count">${(portfolioData.projects || []).length.toString().padStart(2, '0')}</span>`;
      allBtn.addEventListener('click', () => {
        activeSubLabels = [];
        renderProjectsCatalog();
      });
      discRow.appendChild(allBtn);

      const subLabels = portfolioData.subLabelsList || [
        '3D', 'UI/UX', 'INSTALLATION', 'AR / VR', 'GAME', 'PROJECTION', 'PRODUCT', 'ILLUSTRATION'
      ];
      subLabels.forEach(sub => {
        const targetSub = sub.toUpperCase();
        const cnt = (portfolioData.projects || []).filter(p => {
          const subs = getProjectSubLabels(p).map(s => s.toUpperCase());
          const labels = (p.labels || []).map(l => l.toUpperCase());
          return subs.some(s => s === targetSub || s.includes(targetSub) || targetSub.includes(s)) ||
                 labels.some(l => l === targetSub || l.includes(targetSub) || targetSub.includes(l));
        }).length;
        const btn = document.createElement('button');
        const isSelected = activeSubLabels.some(s => s.toUpperCase() === targetSub);
        btn.className = `disc-pill-btn ${isSelected ? 'active' : ''}`;
        btn.setAttribute('data-sublabel', sub);
        btn.innerHTML = `${isSelected ? '✓ ' : ''}${sub} <span class="count">${cnt.toString().padStart(2, '0')}</span>`;
        btn.addEventListener('click', () => {
          if (isSelected) {
            activeSubLabels = activeSubLabels.filter(s => s.toUpperCase() !== targetSub);
          } else {
            activeSubLabels.push(sub);
          }
          renderProjectsCatalog();
        });
        discRow.appendChild(btn);
      });
    }
  }

  function renderProjectsCatalog() {
    buildFilterPills();
    const projs = portfolioData.projects || [];

    // 3. Multi-Tier Filter function: Main Section + Sub-Labels (Multi-Select) + Live Search
    function filterItem(p) {
      const pMainSec = getProjectMainSection(p).toLowerCase();
      const pSubLabels = getProjectSubLabels(p);
      const pLabels = (p.labels || []).map(l => l.toUpperCase());
      const allSubStr = [...pSubLabels, ...pLabels].map(s => s.toUpperCase()).join(' ');

      // Tier 1: Main Section Filter
      if (activeMainSection !== 'all') {
        if (pMainSec !== activeMainSection.toLowerCase()) {
          return false;
        }
      }

      // Tier 2: Multi-Select Sub-Label Filter (matches any chosen tag)
      if (activeSubLabels.length > 0) {
        const matchesAny = activeSubLabels.some(sel => {
          const target = sel.toUpperCase();
          return pSubLabels.some(s => s.toUpperCase() === target || s.toUpperCase().includes(target) || target.includes(s.toUpperCase())) ||
                 pLabels.some(l => l === target || l.includes(target) || target.includes(l));
        });
        if (!matchesAny) return false;
      }

      // Live Smart Multi-Word & Alias Search Query
      if (searchQuery) {
        const aliasesStr = Array.isArray(p.aliases) ? p.aliases.join(' ') : '';
        const keywordsStr = Array.isArray(p.keywords) ? p.keywords.join(' ') : '';
        const customSecStr = Array.isArray(p.customSections)
          ? p.customSections.map(s => `${s.title || ''} ${s.text || ''}`).join(' ')
          : '';
        const overviewStr = Array.isArray(p.overviewSections)
          ? p.overviewSections.map(s => `${s.title || ''} ${s.text || ''}`).join(' ')
          : '';
        const toolsStr = Array.isArray(p.software) ? p.software.map(s => s.name || s.code || '').join(' ') : '';

        const fullCorpus = `${p.title} ${aliasesStr} ${keywordsStr} ${pMainSec} ${allSubStr} ${p.shortDescription || ''} ${p.fullDescription || ''} ${p.tag || ''} ${p.discipline || ''} ${(p.labels || []).join(' ')} ${customSecStr} ${overviewStr} ${toolsStr}`.toLowerCase();

        // 1. Direct whole-string match
        if (!fullCorpus.includes(searchQuery)) {
          // 2. Tokenized multi-word matching with stemming (e.g. "when the ocean breath" or "demon breath")
          const tokens = searchQuery.split(/\s+/).filter(w => w.length > 0);
          const stopWords = ['when', 'where', 'the', 'a', 'an', 'in', 'on', 'of', 'to', 'for', 'at', 'by', 'is', 'it'];
          const significantTokens = tokens.length > 1
            ? tokens.filter(w => !stopWords.includes(w))
            : tokens;
          const matchTarget = significantTokens.length > 0 ? significantTokens : tokens;

          // Helper: stem-aware matching (e.g. breath -> breathes, breathing)
          const matchesStem = (corpus, word) => {
            if (corpus.includes(word)) return true;
            if (word.endsWith('es') && corpus.includes(word.slice(0, -2))) return true;
            if (word.endsWith('s') && corpus.includes(word.slice(0, -1))) return true;
            if (word.endsWith('ing') && corpus.includes(word.slice(0, -3))) return true;
            if (word === 'breath' && (corpus.includes('breathe') || corpus.includes('breathes') || corpus.includes('breathing'))) return true;
            if (word === 'breathe' && (corpus.includes('breath') || corpus.includes('breathes'))) return true;
            if (word === 'demon' && corpus.includes('demon')) return true;
            if (word === 'ocean' && corpus.includes('ocean')) return true;
            return false;
          };

          const allMatch = matchTarget.every(tok => matchesStem(fullCorpus, tok));
          if (!allMatch) return false;
        }
      }

      return true;
    }

    const filteredProjs = projs.filter(filterItem);
    const totalVisible = filteredProjs.length;

    // Helper to generate Card HTML with Main Section Badge, Sub-label tag, and 3D tilt
    function buildCard(p, idx) {
      const card = document.createElement('article');
      card.className = 'project-card card-enter-anim';
      card.setAttribute('data-id', p.id);
      card.style.setProperty('--card-idx', idx);

      const firstImg = p.images && p.images[0] ? (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0].url || '')) : '';
      const cover = p.coverImage || firstImg || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
      const mainSec = getProjectMainSection(p);
      const subLabels = getProjectSubLabels(p);
      const subLabelStr = subLabels.join(' • ');
      const secClass = `sec-${mainSec.toLowerCase()}`;

      card.innerHTML = `
        <span class="card-crosshair ch-tl" aria-hidden="true">+</span>
        <span class="card-crosshair ch-tr" aria-hidden="true">+</span>
        <span class="card-crosshair ch-bl" aria-hidden="true">+</span>
        <span class="card-crosshair ch-br" aria-hidden="true">+</span>
        <div class="card-media-box">
          <img src="${cover}" alt="${p.title}" loading="lazy" />
          <div class="card-caption-overlay">
            <div class="caption-meta-col">
              <div class="card-pills-row">
                <span class="card-sec-badge ${secClass}">${mainSec}</span>
              </div>
              <h3 class="card-title-text">${p.title}</h3>
            </div>
            <span class="card-index-corner">${p.index || '01'}</span>
          </div>
          <div class="card-hover-overlay">
            <div class="card-hover-meta">${subLabelStr}</div>
            <h3 class="card-hover-title">${p.title}</h3>
          </div>
        </div>
      `;

      // 3D Perspective Tilt on Mouse Movement
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotX = ((y - cy) / cy) * -6.5;
        const rotY = ((x - cx) / cx) * 6.5;
        card.style.transform = `perspective(850px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });

      card.addEventListener('click', () => {
        window.location.hash = `project/${p.id}`;
      });

      return card;
    }

    // Render Grid vs Spec Table
    const gridEl = document.getElementById('projects-unified-grid');
    const tableStage = document.getElementById('projects-spec-table-stage');
    const tableBody = document.getElementById('spec-table-body');

    if (activeLayout === 'grid') {
      if (gridEl) {
        const curY = window.scrollY;
        const prevH = gridEl.offsetHeight;
        if (prevH > 0) gridEl.style.minHeight = prevH + 'px';

        gridEl.style.display = totalVisible > 0 ? 'grid' : 'none';
        const fragment = document.createDocumentFragment();
        filteredProjs.forEach((p, idx) => fragment.appendChild(buildCard(p, idx)));
        gridEl.replaceChildren(fragment);
        gridEl.style.minHeight = '';
        if (curY > 0 && !isInitialLoad) {
          window.scrollTo({ top: curY, behavior: 'instant' });
        }
      }
      if (tableStage) tableStage.style.display = 'none';
    } else {
      if (gridEl) gridEl.style.display = 'none';
      if (tableStage) {
        tableStage.style.display = totalVisible > 0 ? 'block' : 'none';
        if (tableBody) {
          const fragment = document.createDocumentFragment();
          filteredProjs.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'spec-row';
            tr.setAttribute('data-id', p.id);
            const firstImg = p.images && p.images[0] ? (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0].url || '')) : '';
            const cover = p.coverImage || firstImg || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
            const mainSec = getProjectMainSection(p);
            const subLabels = getProjectSubLabels(p);
            const secClass = `sec-${mainSec.toLowerCase()}`;
            tr.innerHTML = `
              <td class="spec-ref">${p.index || '01'}</td>
              <td class="spec-title-col">
                <img src="${cover}" alt="${p.title}" class="spec-thumb" loading="lazy" />
                <span class="spec-title">${p.title}</span>
              </td>
              <td>
                <div class="spec-sublabels-wrap">
                  ${subLabels.map(s => `<span class="spec-disc-pill">${s}</span>`).join('')}
                </div>
              </td>
              <td><span class="spec-cat-label ${secClass}">${mainSec}</span></td>
              <td class="spec-year">${p.date || '—'}</td>
              <td class="spec-action-col">
                <span class="spec-action-link">EXPLORE SPEC <span class="spec-arrow">&rarr;</span></span>
              </td>
            `;
            tr.addEventListener('click', () => {
              window.location.hash = `project/${p.id}`;
            });
            fragment.appendChild(tr);
          });
          tableBody.replaceChildren(fragment);
        }
      }
    }

    // Empty Results Message
    const noMsg = document.getElementById('no-projects-msg');
    if (noMsg) {
      noMsg.style.display = totalVisible === 0 ? 'block' : 'none';
    }
  }

  // View Layout Switcher (Grid vs Spec Table)
  layoutToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeLayout = btn.getAttribute('data-layout') || 'grid';
      layoutToggleBtns.forEach(b => b.classList.toggle('active', b === btn));
      renderProjectsCatalog();
    });
  });

  // Search Input Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery ? 'block' : 'none';
      }
      renderProjectsCatalog();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      searchClearBtn.style.display = 'none';
      renderProjectsCatalog();
    });
  }

  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      activeMainSection = 'all';
      activeSubLabels = [];
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
      renderProjectsCatalog();
    });
  }



  /* ================= 5. VIEW 4: PROJECT DETAIL (CASE STUDY) ================= */
  const detailTitle = document.getElementById('detail-title');
  const detailDate = document.getElementById('detail-date');
  const detailIndexTag = document.getElementById('detail-index-tag');
  const detailCatBadge = document.getElementById('detail-category-badge');
  const detailTagsRow = document.getElementById('detail-tags-row');
  const detailFullDesc = document.getElementById('detail-full-description');
  const detailLinksGrid = document.getElementById('detail-related-links-grid');
  const detailLinksSection = document.getElementById('detail-links-section');
  const portraitImagesStack = document.getElementById('portrait-images-stack');
  const detailPortraitContainer = document.getElementById('detail-portrait-container');
  const gapIndicatorText = document.getElementById('gap-indicator-text');
  const detailVideoSection = document.getElementById('detail-video-section');
  const videoPlayerContainer = document.getElementById('video-player-container');
  const detailScrollGallerySection = document.getElementById('detail-scroll-gallery-section');
  const scrollGalleryStage = document.getElementById('scroll-gallery-stage');
  const scrollGalleryTrack = document.getElementById('scroll-gallery-track');
  const prevProjectBtn = document.getElementById('prev-project-btn');
  const nextProjectBtn = document.getElementById('next-project-btn');

  function formatProcessEmbedUrl(rawUrl) {
    if (!rawUrl) return '';
    let u = rawUrl.trim();
    // 1. Google Drive: file/d/ID/view -> file/d/ID/preview, or folders
    if (u.includes('drive.google.com')) {
      const match = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
      const folderMatch = u.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (folderMatch && folderMatch[1]) {
        return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
      }
      const idMatch = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      }
    }
    // 2. Google Docs / Slides / Sheets
    if (u.includes('docs.google.com/presentation')) {
      return u.replace(/\/edit.*$/, '/embed?start=false&loop=false');
    }
    if (u.includes('docs.google.com/document')) {
      return u.replace(/\/edit.*$/, '/preview');
    }
    if (u.includes('docs.google.com/spreadsheets')) {
      return u.replace(/\/edit.*$/, '/preview');
    }
    // 3. Figma Prototype / File
    if (u.includes('figma.com/') && !u.includes('figma.com/embed')) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u)}`;
    }
    // 4. Canva Embed
    if (u.includes('canva.com/design') && !u.includes('embed')) {
      return u.includes('?') ? `${u}&embed` : `${u}?embed`;
    }
    // 5. Dropbox
    if (u.includes('dropbox.com')) {
      return u.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    }
    // 6. Direct PDF
    if (u.toLowerCase().endsWith('.pdf') && !u.includes('#')) {
      return `${u}#toolbar=1&navpanes=0&scrollbar=1`;
    }
    return u;
  }

  function formatVideoEmbedUrl(rawUrl) {
    if (!rawUrl) return '';
    let u = rawUrl.trim();

    // If user pasted an iframe embed code (e.g. from YouTube Share -> Embed)
    if (u.includes('<iframe') || u.startsWith('<iframe')) {
      const srcMatch = u.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        u = srcMatch[1].trim();
      }
    }

    // 1. YouTube
    if (u.includes('youtube.com') || u.includes('youtu.be')) {
      if (u.includes('/embed/')) return u;

      // youtu.be/VIDEO_ID
      const shortMatch = u.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (shortMatch && shortMatch[1]) {
        return `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1`;
      }

      // youtube.com/shorts/VIDEO_ID
      const shortsMatch = u.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch && shortsMatch[1]) {
        return `https://www.youtube.com/embed/${shortsMatch[1]}?rel=0&modestbranding=1`;
      }

      // youtube.com/live/VIDEO_ID
      const liveMatch = u.match(/\/live\/([a-zA-Z0-9_-]+)/);
      if (liveMatch && liveMatch[1]) {
        return `https://www.youtube.com/embed/${liveMatch[1]}?rel=0&modestbranding=1`;
      }

      // youtube.com/watch?v=VIDEO_ID
      const vMatch = u.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (vMatch && vMatch[1]) {
        return `https://www.youtube.com/embed/${vMatch[1]}?rel=0&modestbranding=1`;
      }

      // youtube.com/v/VIDEO_ID or /e/VIDEO_ID
      const pathMatch = u.match(/\/(?:v|e)\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) {
        return `https://www.youtube.com/embed/${pathMatch[1]}?rel=0&modestbranding=1`;
      }
    }

    // 2. Vimeo
    if (u.includes('vimeo.com')) {
      if (u.includes('player.vimeo.com')) return u;
      const vimeoMatch = u.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
      if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
      const simpleMatch = u.match(/vimeo\.com\/(\d+)/);
      if (simpleMatch && simpleMatch[1]) {
        return `https://player.vimeo.com/video/${simpleMatch[1]}`;
      }
    }

    // 3. Bilibili
    if (u.includes('bilibili.com')) {
      const bMatch = u.match(/video\/(BV[a-zA-Z0-9]+)/);
      if (bMatch && bMatch[1]) {
        return `https://player.bilibili.com/player.html?bvid=${bMatch[1]}&page=1`;
      }
    }

    return u;
  }

  function renderProjectDetail(projectId) {
    if (!portfolioData || !portfolioData.projects) return;
    const projs = portfolioData.projects || [];
    const currentIndex = findProjectIndex(projs, projectId);
    const project = projs[currentIndex] || projs[0];

    if (!project) {
      window.location.hash = 'projects';
      return;
    }
    currentActiveProjectId = project.id || project.index || projectId;

    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch(e) {}

    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }

    // Index & Category
    if (detailIndexTag) detailIndexTag.textContent = `${project.index || (currentIndex + 1).toString().padStart(2, '0')} / ${projs.length.toString().padStart(2, '0')}`;
    if (detailCatBadge) {
      const mainSec = getProjectMainSection(project);
      const subLabels = getProjectSubLabels(project);
      const subStr = subLabels.join(' • ');
      detailCatBadge.textContent = `${mainSec} PROJECT • ${subStr}`;
    }

    // Title & Date
    if (detailTitle) detailTitle.textContent = project.title;
    if (detailDate) detailDate.textContent = project.date || '2025';

    // Tags
    if (detailTagsRow) {
      detailTagsRow.innerHTML = '';
      (project.labels || []).forEach(l => {
        const chip = document.createElement('span');
        chip.className = 'detail-tag-chip';
        chip.textContent = l;
        detailTagsRow.appendChild(chip);
      });
    }

    // Description
    if (detailFullDesc) {
      detailFullDesc.textContent = project.fullDescription || project.shortDescription || '';
    }

    // Related Links
    const links = project.relatedLinks || [];
    if (detailLinksGrid && detailLinksSection) {
      detailLinksGrid.innerHTML = '';
      if (links.length > 0) {
        detailLinksSection.style.display = 'block';
        const count = links.length;
        detailLinksGrid.className = 'related-links-grid links-count-' + count + (count === 1 ? ' has-1-link' : ' has-multi-links');
        links.forEach(lk => {
          const a = document.createElement('a');
          a.className = 'related-link-card';
          a.href = lk.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.innerHTML = `<span class="link-card-title">${lk.title || 'RELATED LINK'}</span> <span class="link-card-arrow">&UpperRightArrow;</span>`;
          detailLinksGrid.appendChild(a);
        });
      } else {
        detailLinksSection.style.display = 'none';
      }
    }

    // Main Showcase Images (Continuous Roll 0px Gap)
    if (portraitImagesStack) {
      portraitImagesStack.innerHTML = '';
      const images = project.images || [];

      if (project.hasGap) {
        portraitImagesStack.className = 'portrait-images-stack has-gap';
        if (detailPortraitContainer) detailPortraitContainer.classList.remove('no-gap-container');
        if (gapIndicatorText) gapIndicatorText.textContent = 'MODE: INDIVIDUAL CARDS';
      } else {
        portraitImagesStack.className = 'portrait-images-stack no-gap';
        if (detailPortraitContainer) detailPortraitContainer.classList.add('no-gap-container');
        if (gapIndicatorText) gapIndicatorText.textContent = 'MODE: CONTINUOUS ROLL (0PX GAP)';
      }

      if (images.length > 0) {
        images.forEach((img, idx) => {
          const imgUrl = typeof img === 'string' ? img : (img.url || '');
          if (!imgUrl) return;
          const card = document.createElement('div');
          card.className = 'portrait-image-card';
          card.innerHTML = `
            <div class="portrait-img-box">
              <img src="${imgUrl}" alt="${project.title || 'Project showcase'}" loading="lazy" decoding="async" />
            </div>
          `;
          portraitImagesStack.appendChild(card);
        });
      } else {
        portraitImagesStack.innerHTML = `<div style="font-family:var(--font-mono);font-size:0.8rem;color:#888;padding:3rem;text-align:center;">NO SLIDE SLICES ATTACHED YET.</div>`;
      }
    }

    // Video Section
    if (detailVideoSection && videoPlayerContainer) {
      if (project.videoUrl && project.videoUrl.trim() !== '') {
        const vUrl = project.videoUrl.trim();
        const embedUrl = formatVideoEmbedUrl(vUrl);
        detailVideoSection.style.display = 'block';
        if (
          vUrl.includes('youtube.com') ||
          vUrl.includes('youtu.be') ||
          vUrl.includes('vimeo.com') ||
          vUrl.includes('bilibili.com') ||
          embedUrl.includes('/embed/') ||
          embedUrl.includes('player.')
        ) {
          videoPlayerContainer.innerHTML = `<iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`;
        } else {
          videoPlayerContainer.innerHTML = `<video controls playsinline preload="metadata" src="${embedUrl}"></video>`;
        }
      } else {
        detailVideoSection.style.display = 'none';
        videoPlayerContainer.innerHTML = '';
      }
    }

    // Supplementary Gallery (Horizontal Scrolling Photo Gallery with Hover Text & Mouse Drag-to-Scroll)
    if (detailScrollGallerySection && scrollGalleryTrack) {
      const gallery = project.gallery || [];
      if (gallery.length > 0) {
        detailScrollGallerySection.style.display = 'block';
        scrollGalleryTrack.innerHTML = '';
        gallery.forEach((gItem, gIdx) => {
          const url = typeof gItem === 'string' ? gItem : (gItem.url || '');
          const text = typeof gItem === 'string' ? '' : (gItem.text !== undefined ? gItem.text : (gItem.caption || ''));
          if (!url) return;

          const item = document.createElement('div');
          item.className = 'scroll-gallery-item';

          const imgEl = document.createElement('img');
          imgEl.src = url;
          imgEl.alt = text || `Gallery exhibit 0${gIdx + 1}`;
          imgEl.loading = 'lazy';
          imgEl.decoding = 'async';
          item.appendChild(imgEl);

          if (text && text.trim()) {
            const overlay = document.createElement('div');
            overlay.className = 'scroll-gallery-overlay';

            const badge = document.createElement('div');
            badge.className = 'gallery-overlay-badge';
            badge.textContent = `[ 0${gIdx + 1} • EXHIBIT ]`;
            overlay.appendChild(badge);

            const textEl = document.createElement('div');
            textEl.className = 'gallery-overlay-text';
            textEl.textContent = text.trim();
            overlay.appendChild(textEl);

            item.appendChild(overlay);
          }

          scrollGalleryTrack.appendChild(item);
        });

        if (scrollGalleryStage) {
          if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
          }

          let isDown = false;
          let startX = 0;
          let scrollLeftStart = 0;
          let isDragging = false;
          let userDragActive = false;
          let resumeTimer = null;

          scrollGalleryStage.style.cursor = 'grab';

          const onMouseDown = (e) => {
            isDown = true;
            isDragging = false;
            userDragActive = true;
            startX = e.pageX - scrollGalleryStage.offsetLeft;
            scrollLeftStart = scrollGalleryStage.scrollLeft;
            scrollGalleryStage.style.cursor = 'grabbing';
            clearTimeout(resumeTimer);
          };

          const onMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - scrollGalleryStage.offsetLeft;
            const walk = (x - startX);
            if (Math.abs(walk) > 4) {
              isDragging = true;
            }
            scrollGalleryStage.scrollLeft = scrollLeftStart - walk;
          };

          const onMouseUp = () => {
            if (isDown) {
              isDown = false;
              scrollGalleryStage.style.cursor = 'grab';
              clearTimeout(resumeTimer);
              resumeTimer = setTimeout(() => {
                userDragActive = false;
                isDragging = false;
              }, 450);
            }
          };

          const onTouchStart = () => {
            userDragActive = true;
            clearTimeout(resumeTimer);
          };

          const onTouchEnd = () => {
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(() => {
              userDragActive = false;
            }, 800);
          };

          scrollGalleryStage.onmousedown = onMouseDown;
          window.onmousemove = onMouseMove;
          window.onmouseup = onMouseUp;
          scrollGalleryStage.ontouchstart = onTouchStart;
          scrollGalleryStage.ontouchend = onTouchEnd;

          // Wheel scroll support (mouse wheel over track horizontally scrolls)
          scrollGalleryStage.onwheel = (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              scrollGalleryStage.scrollLeft += e.deltaY * 0.85;
              userDragActive = true;
              clearTimeout(resumeTimer);
              resumeTimer = setTimeout(() => {
                userDragActive = false;
              }, 700);
            }
          };

          // Continuous auto-scroll loop
          if (project.autoScrollImages !== false) {
            autoScrollInterval = setInterval(() => {
              if (scrollGalleryStage && !userDragActive && !isDown && !isPageScrolling) {
                scrollGalleryStage.scrollLeft += 1.0;
                const max = scrollGalleryStage.scrollWidth - scrollGalleryStage.clientWidth;
                if (max > 0 && scrollGalleryStage.scrollLeft >= max - 2) {
                  scrollGalleryStage.scrollLeft = 0;
                }
              }
            }, 28);
          }
        }
      } else {
        detailScrollGallerySection.style.display = 'none';
      }
    }

    // Render Custom Project Sections (Lower Part: Text, Image, Link)
    const customSecsContainer = document.getElementById('detail-custom-sections-container');
    if (customSecsContainer) {
      customSecsContainer.innerHTML = '';
      const customSecs = Array.isArray(project.customSections) ? project.customSections : [];

      customSecs.forEach((cs, idx) => {
        const title = (cs.title || `SECTION 0${idx + 1}`).trim();
        const text = (cs.text || cs.content || '').trim();
        const imgUrl = (cs.imageUrl || '').trim();
        const caption = (cs.imageCaption || '').trim();
        const linkUrl = (cs.linkUrl || '').trim();
        const linkText = (cs.linkText || 'EXPLORE EXTERNAL RESOURCE').trim();

        if (!title && !text && !imgUrl && !linkUrl) return;

        const secBlock = document.createElement('div');
        secBlock.className = 'detail-custom-section-block';

        let innerHtml = `
          <div class="section-label-bar custom-section-header">
            <span class="custom-section-title">${title.toUpperCase()}</span>
          </div>
        `;

        if (text) {
          innerHtml += `
            <div class="custom-section-text-wrap">
              <p class="detail-full-desc">${text}</p>
            </div>
          `;
        }

        if (imgUrl) {
          innerHtml += `
            <div class="custom-section-image-wrap">
              <img src="${imgUrl}" alt="${title}" class="custom-section-img" loading="lazy" />
              ${caption ? `<div class="custom-section-img-caption">${caption}</div>` : ''}
            </div>
          `;
        }

        const isEmbedMode = !!linkUrl && cs.linkMode !== 'button_only';

        if (linkUrl) {
          if (isEmbedMode) {
            const embedSrc = formatProcessEmbedUrl(linkUrl);
            const embedH = parseInt(cs.embedHeight, 10) || 620;
            innerHtml += `
              <div class="custom-section-pdf-viewer">
                <div class="pdf-viewer-bar">
                  <div class="pdf-bar-title-wrap">
                    <span class="pdf-bar-pill">PROCESS PDF</span>
                    <span class="pdf-bar-doc-title">${(linkText || title).toUpperCase()}</span>
                  </div>
                  <div class="pdf-bar-actions">
                    <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="btn-pdf-control btn-pdf-open" title="Open full PDF in new tab">
                      <span class="pdf-ctrl-text">OPEN FULL</span>
                      <span class="pdf-ctrl-icon">&nearr;</span>
                    </a>
                  </div>
                </div>
                <div class="pdf-viewer-viewport" style="height: ${embedH}px;">
                  <iframe src="${embedSrc}" class="pdf-embed-frame" title="${title}" allowfullscreen loading="lazy"></iframe>
                </div>
                <div class="pdf-viewer-footer">
                  <div class="pdf-footer-hint">
                    <span class="hint-bullet">&bull;</span>
                    <span>PROCESS DOCUMENTATION &bull; SCROLL THROUGH THE DOCUMENT, OR CLICK <strong>OPEN FULL &nearr;</strong> TO VIEW IN A NEW TAB.</span>
                  </div>
                </div>
              </div>
            `;
          } else {
            innerHtml += `
              <div class="custom-section-link-wrap">
                <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="custom-section-link-btn">
                  <span>${linkText.toUpperCase()}</span>
                  <span>&rarr;</span>
                </a>
                <span class="custom-section-link-hint">[ OPENS FULL DOCUMENT IN NEW TAB &bull; SCROLL YOURSELF ]</span>
              </div>
            `;
          }
        }

        secBlock.innerHTML = innerHtml;
        customSecsContainer.appendChild(secBlock);
      });

      customSecsContainer.style.display = customSecs.length > 0 ? 'flex' : 'none';
    }

    // Prev / Next Navigation Buttons (Matching Image 3)
    if (prevProjectBtn) {
      const prevIdx = (currentIndex - 1 + projs.length) % projs.length;
      prevProjectBtn.onclick = () => window.location.hash = `project/${projs[prevIdx].id}`;
    }
    if (nextProjectBtn) {
      const nextIdx = (currentIndex + 1) % projs.length;
      nextProjectBtn.onclick = () => window.location.hash = `project/${projs[nextIdx].id}`;
    }
    const btnBackToTop = document.getElementById('btn-back-to-top');
    if (btnBackToTop) {
      btnBackToTop.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    }
  }

  /* ================= 6. VIEW 5: CONTACT PAGE LOGIC ================= */
  function renderContactScreen() {
    const p = portfolioData.profile || {};

    const emailLink = document.getElementById('contact-email-link');
    if (emailLink) {
      const row = emailLink.closest('.table-row');
      const val = (p.email || '').trim();
      if (val) {
        if (row) row.style.display = 'flex';
        emailLink.textContent = val;
        emailLink.href = `mailto:${val}`;
      } else {
        if (row) row.style.display = 'none';
      }
    }

    const phoneLink = document.getElementById('contact-phone-link');
    if (phoneLink) {
      const row = phoneLink.closest('.table-row');
      const val = (p.phone || '').trim();
      if (val) {
        if (row) row.style.display = 'flex';
        phoneLink.textContent = val;
        phoneLink.href = `tel:${val.replace(/[^0-9+]/g, '')}`;
      } else {
        if (row) row.style.display = 'none';
      }
    }

    const behanceLink = document.getElementById('contact-behance-link');
    if (behanceLink) {
      const row = behanceLink.closest('.table-row');
      const val = (p.behanceUrl || '').trim();
      if (val) {
        if (row) row.style.display = 'flex';
        behanceLink.textContent = val.replace(/^https?:\/\//i, '').replace(/\/$/, '');
        behanceLink.href = val.startsWith('http') ? val : `https://${val}`;
      } else {
        if (row) row.style.display = 'none';
      }
    }

    const linktreeLink = document.getElementById('contact-linktree-link');
    if (linktreeLink) {
      const row = linktreeLink.closest('.table-row');
      const val = (p.linktreeUrl || '').trim();
      if (val) {
        if (row) row.style.display = 'flex';
        linktreeLink.textContent = val.replace(/^https?:\/\//i, '').replace(/\/$/, '');
        linktreeLink.href = val.startsWith('http') ? val : `https://${val}`;
      } else {
        if (row) row.style.display = 'none';
      }
    }

    // View Resume Button
    const resumeBtn = document.getElementById('contact-resume-btn');
    const resumeBox = document.getElementById('contact-resume-action-box');
    const resumeVal = (p.resumeUrl || p.cvUrl || '').trim();
    if (resumeBtn && resumeBox) {
      if (resumeVal) {
        resumeBox.style.display = 'flex';
        resumeBtn.href = resumeVal.startsWith('http') ? resumeVal : `https://${resumeVal}`;
        const labelText = (p.resumeBtnText || p.resumeText || 'VIEW RESUME').trim() || 'VIEW RESUME';
        const btnTextEl = resumeBtn.querySelector('.resume-btn-text');
        if (btnTextEl) {
          btnTextEl.textContent = labelText;
        }
      } else {
        resumeBox.style.display = 'none';
      }
    }
  }

  /* ================= 6B. TOP HEADERS & CONTACT STAGE DYNAMIC RENDER ================= */
  function renderTopHeaders() {
    const h = portfolioData.headers || {};
    const about = h.about || {};
    const proj = h.projects || {};
    const contact = h.contact || {};

    const order = (portfolioData && Array.isArray(portfolioData.pageOrder))
      ? portfolioData.pageOrder
      : ['home', 'projects', 'about', 'contact'];
    const subpages = order.filter(k => k !== 'home');

    function formatSeqIndex(pageKey, rawVal, fallback) {
      const pos = subpages.indexOf(pageKey);
      const val = rawVal || fallback;
      if (pos !== -1 && /^\d+\s*[\/\-•]/.test(val)) {
        const numStr = String(pos + 1).padStart(2, '0');
        return val.replace(/^\d+/, numStr);
      }
      return val;
    }

    // About top header
    const abIdx = document.getElementById('about-top-index');
    if (abIdx) abIdx.textContent = formatSeqIndex('about', about.index, '01 / ABOUT ME');
    const abTitle = document.getElementById('about-top-title');
    if (abTitle) abTitle.textContent = about.title || 'ABOUT';
    const abDisc = document.getElementById('about-top-discipline');
    if (abDisc) {
      const disc = (about.discipline !== undefined ? about.discipline : 'INTERACTIVE SPATIAL DESIGN').trim();
      if (disc) {
        abDisc.textContent = disc;
        abDisc.style.display = '';
      } else {
        abDisc.textContent = '';
        abDisc.style.display = 'none';
      }
    }
    const abDesc = document.getElementById('about-top-desc');
    if (abDesc) abDesc.textContent = about.description || 'Background, education, capabilities and the experiences driving my practice.';

    // Projects top header
    const prIdx = document.getElementById('projects-top-index');
    if (prIdx) prIdx.textContent = formatSeqIndex('projects', proj.index, '02 / VIEW PROJECT');
    const prTitle = document.getElementById('projects-top-title');
    if (prTitle) prTitle.textContent = proj.title || 'PROJECTS';
    const prDisc = document.getElementById('projects-top-discipline');
    if (prDisc) {
      const disc = (proj.discipline !== undefined ? proj.discipline : 'INTERACTIVE SPATIAL DESIGN').trim();
      if (disc) {
        prDisc.textContent = disc;
        prDisc.style.display = '';
      } else {
        prDisc.textContent = '';
        prDisc.style.display = 'none';
      }
    }
    const prDesc = document.getElementById('projects-top-desc');
    if (prDesc) prDesc.textContent = proj.description || 'Seventeen works across academic study, competitions and professional practice.';

    // Contact top header
    const coIdx = document.getElementById('contact-top-index');
    if (coIdx) coIdx.textContent = formatSeqIndex('contact', contact.index, '03 / GET IN TOUCH');
    const coTitle = document.getElementById('contact-top-title');
    if (coTitle) coTitle.textContent = contact.title || 'CONTACT';
    const coDisc = document.getElementById('contact-top-discipline');
    if (coDisc) {
      const disc = (contact.discipline !== undefined ? contact.discipline : 'INTERACTIVE SPATIAL DESIGN').trim();
      if (disc) {
        coDisc.textContent = disc;
        coDisc.style.display = '';
      } else {
        coDisc.textContent = '';
        coDisc.style.display = 'none';
      }
    }
    const coDesc = document.getElementById('contact-top-desc');
    if (coDesc) coDesc.textContent = contact.description || 'Available for collaborations, internships and thoughtful creative opportunities.';

    // Contact stage dark panel
    const stHdg = document.getElementById('contact-stage-heading');
    if (stHdg && contact.startProjectHeading) {
      stHdg.innerHTML = contact.startProjectHeading.replace(/\n/g, '<br />');
    }
    const stCall = document.getElementById('contact-stage-callout');
    if (stCall && contact.startProjectCallout) {
      stCall.textContent = contact.startProjectCallout;
    }
  }

  /* ================= 7. MASTER RENDER & LIVE SYNC ================= */
  function renderAll() {
    if (!portfolioData) return;
    const savedY = window.scrollY;
    try { renderHomeScreen(); } catch(e) { console.warn('Render Home error:', e); }
    try { renderAboutScreen(); } catch(e) { console.warn('Render About error:', e); }
    try { renderProjectsCatalog(); } catch(e) { console.warn('Render Projects error:', e); }
    try { renderContactScreen(); } catch(e) { console.warn('Render Contact error:', e); }
    try { renderTopHeaders(); } catch(e) { console.warn('Render Headers error:', e); }
    try { applyPageOrder(); } catch(e) { console.warn('Apply Page Order error:', e); }
    try { applyPageVisibility(); } catch(e) { console.warn('Apply Page Visibility error:', e); }
    try { applySectionVisibility(); } catch(e) { console.warn('Apply Section Visibility error:', e); }
    if (savedY > 0 && !isInitialLoad) {
      window.scrollTo({ top: savedY, behavior: 'instant' });
    }
  }



  // Re-sync instantly when user switches back to this tab
  async function refreshLiveState() {
    if (!window.PortfolioDB) return;
    try {
      const fresh = await window.PortfolioDB.getData();
      if (fresh) {
        portfolioData = fresh;
        renderAll();
        const hash = window.location.hash.replace('#', '');
        const detailView = document.getElementById('view-project-detail');
        const isDetailActive = detailView && detailView.classList.contains('active');
        if (hash.startsWith('project/')) {
          renderProjectDetail(hash.split('/')[1]);
        } else if (isDetailActive && currentActiveProjectId) {
          renderProjectDetail(currentActiveProjectId);
        }
      }
    } catch(e) {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshLiveState();
    }
  });

  window.addEventListener('focus', refreshLiveState);

  /* ================= 8. HERO INTERACTIVE ANIMATIONS & LETTER SOUNDS ================= */
  // A. Architectural Web Audio Synthesizer (Zero asset dependencies)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Pure Solfège scale (Do Re Mi Fa So La Si Do)
  const solfegeScale = {
    'do':  261.63, // C4 (Do)
    're':  293.66, // D4 (Re)
    'mi':  329.63, // E4 (Mi)
    'fa':  349.23, // F4 (Fa)
    'so':  392.00, // G4 (So)
    'la':  440.00, // A4 (La)
    'si':  493.88, // B4 (Si / Ti)
    'do8': 523.25, // C5 (High Do)
    // Fallbacks by character
    'P': 261.63, // Do
    'O': 293.66, // Re
    'R': 329.63, // Mi
    'T': 349.23, // Fa
    'F': 392.00, // So
    'L': 493.88, // Si
    'I': 523.25  // High Do
  };

  function playLetterNote(letterEl, isUnlock = false, comboIndex = 1) {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (isUnlock) {
      // Ascending triumphant celebratory scale run for admin unlock
      const solfegeRun = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99];
      solfegeRun.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.042);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.042);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.042 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.042 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.042);
        osc.stop(ctx.currentTime + idx * 0.042 + 0.34);
      });
      return;
    }

    // Determine exact pitch from data-note or letter fallback
    let freq = 261.63;
    if (typeof letterEl === 'string') {
      freq = solfegeScale[letterEl.toLowerCase()] || solfegeScale[letterEl.toUpperCase()] || 261.63;
    } else if (letterEl && letterEl.dataset) {
      const noteKey = (letterEl.dataset.note || '').toLowerCase();
      const charKey = (letterEl.dataset.letter || letterEl.textContent || '').trim().toUpperCase();
      freq = solfegeScale[noteKey] || solfegeScale[charKey] || 261.63;
    }

    // Pitch ascension during rapid consecutive taps on P (semitone progression)
    if (comboIndex > 1) {
      freq = freq * Math.pow(1.05946, Math.min(comboIndex - 1, 5));
    }

    const now = ctx.currentTime;

    // 1. Primary fundamental chime oscillator
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // 2. Harmonic chime oscillator (warm octave overtone)
    const harmonicOsc = ctx.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(freq * 2, now);

    // 3. Attack strike transient (wood/metal acoustic strike)
    const strikeOsc = ctx.createOscillator();
    strikeOsc.type = 'triangle';
    strikeOsc.frequency.setValueAtTime(freq * 3, now);

    // 4. Low-pass filter for acoustic warmth & resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3600, now);
    filter.frequency.exponentialRampToValueAtTime(850, now + 0.35);

    // Dynamic Envelopes
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.exponentialRampToValueAtTime(0.22, now + 0.004);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.001, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.09, now + 0.004);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    const strikeGain = ctx.createGain();
    strikeGain.gain.setValueAtTime(0.001, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.06, now + 0.002);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(mainGain);
    harmonicOsc.connect(harmonicGain);
    strikeOsc.connect(strikeGain);

    mainGain.connect(filter);
    harmonicGain.connect(filter);
    strikeGain.connect(filter);

    filter.connect(ctx.destination);

    osc.start(now);
    harmonicOsc.start(now);
    strikeOsc.start(now);

    osc.stop(now + 0.45);
    harmonicOsc.stop(now + 0.45);
    strikeOsc.stop(now + 0.06);
  }

  // B. Architectural Spark Particle Generator (+ symbol only)
  const sparkSymbols = ['+'];
  function spawnSparks(x, y) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'architectural-spark';
      spark.textContent = sparkSymbols[Math.floor(Math.random() * sparkSymbols.length)];
      
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 30 + Math.random() * 45;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 15;
      const tr = (Math.random() - 0.5) * 120;

      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--tx', `${tx}px`);
      spark.style.setProperty('--ty', `${ty}px`);
      spark.style.setProperty('--tr', `${tr}deg`);

      document.body.appendChild(spark);
      setTimeout(() => {
        spark.remove();
      }, 700);
    }
  }

  // C. Interactive Hero Letter Click Dispatcher (v1 Kinetic Animations)
  const animClasses = [
    'anim-rubber',
    'anim-flip-3d',
    'anim-jump-spin',
    'anim-glitch',
    'anim-barrel',
    'anim-pop-wave'
  ];

  let pClickCount = 0;
  let pClickTimer = null;
  const RAPID_TAP_TIMEOUT = 650; // Must click within 650ms consecutively to count as fast

  /* ================= 7B. STUDIO AUTHENTICATION MODAL LOGIC ================= */
  const authModal = document.getElementById('site-auth-modal');
  const authForm = document.getElementById('site-auth-form');
  const authUserInp = document.getElementById('auth-input-user');
  const authPassInp = document.getElementById('auth-input-pass');
  const authError = document.getElementById('site-auth-error');
  const authCloseBtn = document.getElementById('site-auth-close');
  const authCancelBtn = document.getElementById('site-auth-cancel');

  function resetSecretPState() {
    pClickCount = 0;
    clearTimeout(pClickTimer);
    document.querySelectorAll('.secret-p-trigger, .hero-letter').forEach(el => {
      el.classList.remove('p-unlocked', 'p-tap', 'p-active', 'p-clicked-1', 'p-clicked-2');
      el.style.opacity = '1';
      el.style.filter = '';
    });
  }

  function openAuthModal() {
    pClickCount = 0;
    clearTimeout(pClickTimer);
    playLetterNote(null, true);
    document.querySelectorAll('.secret-p-trigger').forEach(el => {
      el.style.opacity = '1';
      el.classList.remove('p-unlocked', 'p-active');
    });
    if (authModal) {
      authModal.style.display = 'flex';
      if (authError) authError.style.display = 'none';
      if (authUserInp) {
        authUserInp.value = '';
        setTimeout(() => authUserInp.focus(), 60);
      }
      if (authPassInp) authPassInp.value = '';
    }
  }

  function closeAuthModal() {
    if (authModal) authModal.style.display = 'none';
    if (authUserInp) authUserInp.value = '';
    if (authPassInp) authPassInp.value = '';
    if (authError) authError.style.display = 'none';
    resetSecretPState();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal && authModal.style.display === 'flex') {
      closeAuthModal();
    }
  });

  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
  if (authCancelBtn) authCancelBtn.addEventListener('click', closeAuthModal);
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = (authUserInp ? authUserInp.value : '').trim();
      const pass = (authPassInp ? authPassInp.value : '').trim();

      // Dynamic credentials check (can be changed from Admin settings)
      let currentAuth = { username: 'RENEE@MOO081706', password: '36987@RENEE6667' };
      if (window.PortfolioDB && window.PortfolioDB.getAdminAuth) {
        currentAuth = window.PortfolioDB.getAdminAuth();
      } else {
        try {
          const custom = localStorage.getItem('renee_admin_auth_custom');
          if (custom) currentAuth = JSON.parse(custom);
        } catch(e) {}
      }

      if (user.toUpperCase() === (currentAuth.username || '').toUpperCase() && pass === currentAuth.password) {
        sessionStorage.setItem('renee_admin_authenticated', 'true');
        try { localStorage.removeItem('renee_admin_authenticated'); } catch(e) {}
        if (window.PortfolioDB && window.PortfolioDB.channel) {
          try {
            window.PortfolioDB.channel.postMessage({ type: 'AUTH_LOGIN' });
          } catch(err) {}
        }
        closeAuthModal();
        window.location.href = 'admin.html';
      } else {
        if (authError) authError.style.display = 'block';
        if (authPassInp) {
          authPassInp.value = '';
          authPassInp.focus();
        }
      }
    });
  }

  function handleLetterClick(letterEl, clientX, clientY) {
    const char = (letterEl.dataset.letter || letterEl.textContent || '').trim().toUpperCase();
    const isP = char === 'P' || letterEl.classList.contains('secret-p-trigger');

    // 1. Secret Admin Combo Counter: ONLY letter 'P' clicked FAST 6 times in a row!
    if (isP) {
      pClickCount++;
      clearTimeout(pClickTimer);
      // Reset immediately if next click doesn't happen within 650ms (strictly fast consecutive taps only)
      pClickTimer = setTimeout(() => {
        pClickCount = 0;
        letterEl.classList.remove('p-tap');
      }, RAPID_TAP_TIMEOUT);

      letterEl.classList.remove('p-tap');
      void letterEl.offsetWidth; // Reflow
      letterEl.classList.add('p-tap');

      // Play note with rising pitch on rapid consecutive combo
      playLetterNote(letterEl, false, pClickCount);

      if (pClickCount >= 6) {
        pClickCount = 0;
        clearTimeout(pClickTimer);
        letterEl.classList.add('p-unlocked');
        setTimeout(() => {
          letterEl.classList.remove('p-unlocked');
          letterEl.style.opacity = '1';
        }, 550);
        openAuthModal();
      }
    } else {
      // If ANY other letter is clicked, immediately reset the consecutive P combo to 0!
      resetSecretPState();
      playLetterNote(letterEl, false, 1);
    }

    // 2. Spawn Architectural Sparks (+ symbol) at click position
    const rect = letterEl.getBoundingClientRect();
    const sparkX = clientX !== undefined && clientX > 0 ? clientX : (rect.left + rect.width / 2);
    const sparkY = clientY !== undefined && clientY > 0 ? clientY : (rect.top + rect.height / 2);
    spawnSparks(sparkX, sparkY);

    // 3. Trigger Dynamic Kinetic Animation (v1 original)
    animClasses.forEach(cls => letterEl.classList.remove(cls));
    void letterEl.offsetWidth; // Force reflow

    const chosenAnim = animClasses[Math.floor(Math.random() * animClasses.length)];
    letterEl.classList.add(chosenAnim);
    setTimeout(() => {
      letterEl.classList.remove(chosenAnim);
    }, 750);
  }

  // Delegated click listener for all interactive letters
  document.addEventListener('click', (e) => {
    // Check if clicked element is a hero letter or secret-p-trigger
    const letterTarget = e.target.closest('.hero-letter, .secret-p-trigger');
    if (letterTarget) {
      e.preventDefault();
      e.stopPropagation();
      handleLetterClick(letterTarget, e.clientX, e.clientY);
      return;
    }
    // If clicked anywhere else on page, reset P consecutive counter and restore full opacity
    resetSecretPState();
  });

  // D. Fixed Architectural Grid (hero tilt disabled to ensure grid lines stay perfectly stationary and aligned)
  const homeCenterHero = document.getElementById('home-center-hero');
  if (homeCenterHero) {
    homeCenterHero.style.transform = 'none';
  }

  // E. Sequential Letter Ripple Wave on Initial View
  function triggerLetterIntroWave() {
    const letters = document.querySelectorAll('.hero-letter');
    letters.forEach((letter, idx) => {
      setTimeout(() => {
        letter.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
        letter.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          letter.style.transform = '';
          setTimeout(() => {
            letter.style.transition = '';
          }, 350);
        }, 220);
      }, idx * 60);
    });
  }

  // F. Interactive Spatial Lattice Canvas (+ Symbol Animation Only)
  function initHomeSpatialCanvas() {
    const canvas = document.getElementById('home-spatial-canvas');
    const stage = document.getElementById('home-interactive-stage');
    if (!canvas || !stage) return;

    const ctx = canvas.getContext('2d');
    let width = Math.max(stage.clientWidth || window.innerWidth || 1200, 320);
    let height = Math.max(stage.clientHeight || window.innerHeight || 800, 320);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId = null;

    function resize() {
      const rect = stage.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : (stage.clientWidth || window.innerWidth || 1200);
      const h = rect.height > 0 ? rect.height : (stage.clientHeight || window.innerHeight || 800);
      width = Math.max(Math.floor(w), 320);
      height = Math.max(Math.floor(h), 320);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => resize());
      ro.observe(stage);
    }

    // Subtle architectural micro-nodes (+ symbols) - clean, minimalist density
    const isTouchHome = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const NODE_COUNT = isTouchHome ? 6 : 10;
    const nodes = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: 20 + Math.random() * Math.max(width - 40, 200),
        y: 20 + Math.random() * Math.max(height - 40, 200),
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        size: 4 + Math.random() * 2,
        baseAlpha: 0.15 + Math.random() * 0.18
      });
    }

    let mouse = { x: -9999, y: -9999, active: false };

    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Only active if genuinely within the stage bounds (never along 0px edge)
      if (mx > 5 && my > 5 && mx < width - 5 && my < height - 5) {
        mouse.x = mx;
        mouse.y = my;
        mouse.active = true;
      } else {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
      }
    }, { passive: true });

    stage.addEventListener('mouseleave', () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }, { passive: true });

    function draw() {
      // Only animate when on home screen and canvas is visible
      const isHome = document.body.classList.contains('on-home') || !window.location.hash || window.location.hash === '#home' || window.location.hash === '#';
      if (!isHome) {
        animationFrameId = null;
        return; // Stop animation loop completely when off home!
      }

      if (width < 50 || height < 50) {
        resize();
      }

      ctx.clearRect(0, 0, width, height);

      const isNavy = document.body.classList.contains('theme-navy');
      const rgbBase = isNavy ? '218, 209, 202' : '11, 11, 10';

      // Update & draw + symbol nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Cursor proximity interaction: gentle spatial repulsion & hairline connecting beam
        if (mouse.active && mouse.x > 0 && mouse.y > 0) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120;

          if (dist < maxDist && dist > 1) {
            const force = (maxDist - dist) / maxDist;
            node.x += (dx / dist) * force * 1.4;
            node.y += (dy / dist) * force * 1.4;

            // Hairline connecting beam between mouse cursor and + symbol
            const beamAlpha = force * 0.28;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${rgbBase}, ${beamAlpha})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
          }
        }

        // Drift physics
        node.x += node.vx;
        node.y += node.vy;

        // Wrap around bounds with smooth margin
        if (node.x < -15) node.x = width + 15;
        if (node.x > width + 15) node.x = -15;
        if (node.y < -15) node.y = height + 15;
        if (node.y > height + 15) node.y = -15;

        // Faint connecting lines between close neighbor + nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const ndx = node.x - other.x;
          const ndy = node.y - other.y;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
          if (nDist < 80) {
            const lineAlpha = (1 - nDist / 80) * 0.07;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${rgbBase}, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }

        // Render + symbol shape
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.strokeStyle = `rgba(${rgbBase}, ${node.baseAlpha})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(-node.size, 0);
        ctx.lineTo(node.size, 0);
        ctx.moveTo(0, -node.size);
        ctx.lineTo(0, node.size);
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    }

    function checkHomeCanvas() {
      const isHome = document.body.classList.contains('on-home') || !window.location.hash || window.location.hash === '#home' || window.location.hash === '#';
      if (isHome && !animationFrameId) {
        draw();
      }
    }
    window.addEventListener('hashchange', checkHomeCanvas, { passive: true });

    draw();
  }

  // G. Center Architectural Compass 3D Spatial Tilt & Needle Tracking
  function initCenterCompass() {
    const compass = document.getElementById('hero-center-compass');
    const needle = compass ? compass.querySelector('#compass-needle') : null;
    const headerNeedle = document.getElementById('header-compass-needle');
    const stage = document.getElementById('home-interactive-stage') || document.body;
    if (!compass || !needle) return;

    let targetAngle = 0;
    let currentAngle = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let targetTransX = 0;
    let targetTransY = 0;
    let currentTransX = 0;
    let currentTransY = 0;
    let animRaf = null;

    function updateCompass() {
      // Lerp needle angle
      let diff = targetAngle - currentAngle;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      currentAngle += diff * 0.12;
      needle.style.transform = `rotate(${currentAngle.toFixed(2)}deg)`;
      if (headerNeedle) {
        headerNeedle.style.transform = `rotate(${currentAngle.toFixed(2)}deg)`;
      }

      // Lerp 3D tilt & parallax translation
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;
      currentTransX += (targetTransX - currentTransX) * 0.08;
      currentTransY += (targetTransY - currentTransY) * 0.08;

      compass.style.transform = `translate(calc(-50% + ${currentTransX.toFixed(1)}px), calc(-50% + ${currentTransY.toFixed(1)}px)) perspective(1000px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg)`;

      const stillMoving = Math.abs(diff) > 0.05 ||
                          Math.abs(targetTiltX - currentTiltX) > 0.02 ||
                          Math.abs(targetTiltY - currentTiltY) > 0.02 ||
                          Math.abs(targetTransX - currentTransX) > 0.02 ||
                          Math.abs(targetTransY - currentTransY) > 0.02;

      if (stillMoving) {
        animRaf = requestAnimationFrame(updateCompass);
      } else {
        animRaf = null;
      }
    }

    function onMouseMove(e) {
      if (compass.offsetParent === null) return;

      const rect = compass.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // 1. Needle heading angle
      let rad = Math.atan2(dy, dx);
      let deg = rad * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      targetAngle = deg;

      // 2. 3D Spatial Tilt following cursor
      const stageRect = stage.getBoundingClientRect();
      const halfW = (stageRect.width / 2) || (window.innerWidth / 2) || 1;
      const halfH = (stageRect.height / 2) || (window.innerHeight / 2) || 1;
      const normX = Math.max(-1, Math.min(1, dx / halfW));
      const normY = Math.max(-1, Math.min(1, dy / halfH));

      const maxTilt = 18; // 18 degrees 3D spatial tilt
      targetTiltX = -normY * maxTilt;
      targetTiltY = normX * maxTilt;
      targetTransX = normX * 16; // subtle 3D parallax shift
      targetTransY = normY * 16;

      if (!animRaf) {
        animRaf = requestAnimationFrame(updateCompass);
      }
    }

    let lastOrientationTime = 0;
    function onDeviceOrientation(e) {
      if (!document.body.classList.contains('on-home') || compass.offsetParent === null) return;
      const now = Date.now();
      if (now - lastOrientationTime < 40) return; // Cap at 25fps to save mobile CPU/battery
      lastOrientationTime = now;

      if (e.gamma !== null && e.beta !== null) {
        const normGamma = Math.max(-1, Math.min(1, e.gamma / 30));
        const normBeta = Math.max(-1, Math.min(1, (e.beta - 40) / 30));

        const maxTilt = 14;
        targetTiltX = -normBeta * maxTilt;
        targetTiltY = normGamma * maxTilt;
        targetTransX = normGamma * 8;
        targetTransY = normBeta * 8;

        if (!animRaf) {
          animRaf = requestAnimationFrame(updateCompass);
        }
      }
    }

    function onMouseLeave() {
      targetTiltX = 0;
      targetTiltY = 0;
      targetTransX = 0;
      targetTransY = 0;
      if (!animRaf) {
        animRaf = requestAnimationFrame(updateCompass);
      }
    }

    // Only track cursor movement with desktop mouse pointer (never hijack mobile touch scrolling!)
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    }
    document.addEventListener('mouseleave', onMouseLeave);
  }

  // 2. Keyboard Shortcut: Ctrl+Shift+A or Cmd+Shift+A to quickly open Admin CMS
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAuthModal();
    }
  });

  // 3. Double-click on copyright mark to open Admin CMS
  const copyrightMarks = document.querySelectorAll('.home-year-copyright, .footer-copyright');
  copyrightMarks.forEach(el => {
    el.style.cursor = 'default';
    el.addEventListener('dblclick', () => {
      openAuthModal();
    });
  });

  // H. Universal Interactive Spatial Canvas Engine (+ Symbol Animation with Dynamic Light/Dark Contrast & Scroll Sync)
  function createSpatialCanvasEngine(canvasId, viewId, options = {}) {
    const canvas = document.getElementById(canvasId);
    const viewEl = document.getElementById(viewId);
    if (!canvas || !viewEl) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animId = null;
    let isRunning = false;

    // Cache metrics to eliminate 60fps layout thrashing on mobile
    let cachedPageHeight = window.innerHeight * 1.5;
    let darkRects = [];

    function updateMetrics() {
      cachedPageHeight = Math.max(window.innerHeight * 1.5, viewEl.scrollHeight || document.documentElement.scrollHeight || 0);
      darkRects = [];
      if (options.detectDark) {
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const darkEls = viewEl.querySelectorAll('.contact-dark-stage, .dark-stage, [data-dark-bg="true"]');
        for (let d = 0; d < darkEls.length; d++) {
          const rect = darkEls[d].getBoundingClientRect();
          darkRects.push({
            left: rect.left,
            right: rect.right,
            worldTop: rect.top + scrollY,
            worldBottom: rect.bottom + scrollY
          });
        }
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      updateMetrics();
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Balanced architectural density for subpages ("more a little" as requested)
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const baseDensity = isTouch ? 7 : (options.nodeDensity || 11);
    const screenRatio = Math.max(1, cachedPageHeight / (window.innerHeight || 800));
    const maxNodes = isTouch ? 14 : 26;
    const minNodes = isTouch ? 8 : 18;
    const NODE_COUNT = Math.min(maxNodes, Math.max(minNodes, Math.round(baseDensity * Math.min(screenRatio, 3.5))));

    // Architectural micro-nodes in world space (+ symbols)
    const nodes = [];
    // Ensure 3-4 nodes are immediately placed inside the top header stage (top 30px - 250px)
    const headerNodeCount = Math.min(4, Math.max(2, Math.floor(NODE_COUNT * 0.18)));
    for (let i = 0; i < NODE_COUNT; i++) {
      let initY;
      if (i < headerNodeCount) {
        initY = 35 + Math.random() * 220; // Direct within the top header stage
      } else {
        initY = Math.random() * cachedPageHeight;
      }
      nodes.push({
        x: 25 + Math.random() * Math.max(width - 50, 200),
        worldY: initY,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.26,
        size: 3.5 + Math.random() * 2,
        baseAlpha: 0.18 + Math.random() * 0.16
      });
    }

    let mouse = { x: -9999, y: -9999, active: false };

    window.addEventListener('mousemove', (e) => {
      if (!viewEl.classList.contains('active')) return;
      if (e.clientX <= 5 || e.clientY <= 5 || e.clientX >= width - 5 || e.clientY >= height - 5) {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
        return;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    });

    // Dynamic color: over dark stage -> light, over paper/navy background -> contrast
    function getColor(x, screenY, alphaMul = 1) {
      const isNavy = document.body.classList.contains('theme-navy');
      const lightR = isNavy ? 218 : 11;
      const lightG = isNavy ? 209 : 11;
      const lightB = isNavy ? 202 : 10;
      const darkR = isNavy ? 250 : 255;
      const darkG = isNavy ? 248 : 255;
      const darkB = isNavy ? 245 : 255;
      const baseAlpha = isNavy ? 0.32 : 0.22;

      if (!options.detectDark || darkRects.length === 0) {
        return `rgba(${lightR}, ${lightG}, ${lightB}, ${(baseAlpha * alphaMul).toFixed(3)})`;
      }
      let darkRatio = 0;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      for (let k = 0; k < darkRects.length; k++) {
        const r = darkRects[k];
        if (x >= r.left && x <= r.right) {
          const screenTop = r.worldTop - scrollY;
          const screenBottom = r.worldBottom - scrollY;
          if (screenY >= screenTop && screenY <= screenBottom) {
            darkRatio = 1;
            break;
          }
          if (screenY >= screenTop - 40 && screenY < screenTop) {
            darkRatio = Math.max(darkRatio, 1 - (screenTop - screenY) / 40);
          }
        }
      }
      if (darkRatio > 0.05) {
        const r = Math.round(lightR + (darkR - lightR) * darkRatio);
        const g = Math.round(lightG + (darkG - lightG) * darkRatio);
        const b = Math.round(lightB + (darkB - lightB) * darkRatio);
        const a = Math.min(1, baseAlpha * (1 + 1.2 * darkRatio) * alphaMul).toFixed(3);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      return `rgba(${lightR}, ${lightG}, ${lightB}, ${(baseAlpha * alphaMul).toFixed(3)})`;
    }

    function draw() {
      if (!viewEl.classList.contains('active')) {
        isRunning = false;
        animId = null;
        return; // STOP animation loop completely when this subpage is not active!
      }

      ctx.clearRect(0, 0, width, height);

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const isNavy = document.body.classList.contains('theme-navy');

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Drift physics in world coordinates
        node.x += node.vx;
        node.worldY += node.vy;

        if (node.x < -15) node.x = width + 15;
        if (node.x > width + 15) node.x = -15;
        if (node.worldY < -15) node.worldY = cachedPageHeight + 15;
        if (node.worldY > cachedPageHeight + 15) node.worldY = -15;

        // Screen Y position relative to current viewport scroll (moves 1:1 with scrolling)
        const screenY = node.worldY - scrollY;
        const isVisible = (screenY >= -50 && screenY <= height + 50);

        // Cursor proximity interaction: gentle spatial repulsion & hairline connecting beam
        if (mouse.active && isVisible && mouse.x > 0 && mouse.y > 0) {
          const dx = node.x - mouse.x;
          const dy = screenY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120;

          if (dist < maxDist && dist > 1) {
            const force = (maxDist - dist) / maxDist;
            node.x += (dx / dist) * force * 1.4;
            node.worldY += (dy / dist) * force * 1.4;

            // Hairline connecting beam
            const beamAlpha = force * (isNavy ? 0.40 : 0.28);
            ctx.beginPath();
            ctx.strokeStyle = getColor((node.x + mouse.x) / 2, (screenY + mouse.y) / 2, beamAlpha / (isNavy ? 0.32 : 0.22));
            ctx.lineWidth = 0.75;
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(node.x, screenY);
            ctx.stroke();
          }
        }

        if (isVisible) {
          // Faint connecting lines between close neighbor + nodes on screen (skip on mobile for buttery smooth 60fps scrolling)
          if (!isTouch) {
            for (let j = i + 1; j < nodes.length; j++) {
              const other = nodes[j];
              const otherScreenY = other.worldY - scrollY;
              if (otherScreenY >= -50 && otherScreenY <= height + 50) {
                const ndx = node.x - other.x;
                const ndy = screenY - otherScreenY;
                const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
                if (nDist < 90) {
                  const lineAlpha = (1 - nDist / 90) * (isNavy ? 0.16 : 0.10);
                  ctx.beginPath();
                  ctx.strokeStyle = getColor((node.x + other.x) / 2, (screenY + otherScreenY) / 2, lineAlpha / (isNavy ? 0.32 : 0.22));
                  ctx.lineWidth = 0.55;
                  ctx.moveTo(node.x, screenY);
                  ctx.lineTo(other.x, otherScreenY);
                  ctx.stroke();
                }
              }
            }
          }

          // Render + symbol shape
          ctx.save();
          ctx.translate(node.x, screenY);
          ctx.strokeStyle = getColor(node.x, screenY, node.baseAlpha / 0.20);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(-node.size, 0);
          ctx.lineTo(node.size, 0);
          ctx.moveTo(0, -node.size);
          ctx.lineTo(0, node.size);
          ctx.stroke();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    function checkActiveAndRun() {
      if (viewEl.classList.contains('active')) {
        if (!isRunning) {
          isRunning = true;
          resize();
          draw();
        } else {
          updateMetrics();
        }
      } else {
        isRunning = false;
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }
    }

    if (window.MutationObserver) {
      const observer = new MutationObserver(checkActiveAndRun);
      observer.observe(viewEl, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('hashchange', checkActiveAndRun, { passive: true });

    checkActiveAndRun();
  }

  // Initialize Home Animations (+ Symbol Animation & Center Compass)
  initHomeSpatialCanvas();
  initCenterCompass();

  // Initialize Subpage Spatial Canvases (+ Symbol Animation with Dynamic Contrast & Scroll Sync)
  createSpatialCanvasEngine('projects-spatial-canvas', 'view-projects', { detectDark: false, nodeDensity: 12 });
  createSpatialCanvasEngine('about-spatial-canvas', 'view-about', { detectDark: true, nodeDensity: 11 });
  createSpatialCanvasEngine('contact-spatial-canvas', 'view-contact', { detectDark: true, nodeDensity: 11 });
  createSpatialCanvasEngine('detail-spatial-canvas', 'view-project-detail', { detectDark: false, nodeDensity: 9 });

  // Initial execution
  renderAll();
  handleHashChange();
  isInitialLoad = false;
});
