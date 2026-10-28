/**
 * MOO RENEE — Database & State Storage Layer (v3)
 * Uses IndexedDB with LocalStorage fallback & cross-tab synchronization.
 * Supports persistent saving, JSON export/import, and automatic default seeding.
 * Contains the complete 17 projects and architectural portfolio dataset.
 */

const DB_KEY = 'moo_renee_portfolio_data_v3';
const DRAFT_KEY = 'moo_renee_portfolio_draft_v3';
const DB_NAME = 'MooReneePortfolioDB';
const DB_STORE = 'portfolio_store';
const CLOUD_CONFIG_KEY = 'moo_renee_firebase_config';
const CLOUD_COLLECTION = 'portfolio';
const CLOUD_DOC = 'live_data';

// Default initial data matching user's exact portfolio sheets
const DEFAULT_PORTFOLIO_DATA = {
  _lastUpdated: 1,
  adminAuth: {
    username: "RENEE@MOO081706",
    password: "36987@RENEE6667"
  },
  pageVisibility: {
    home: true,
    about: true,
    projects: true,
    contact: true
  },
  pageOrder: ['home', 'projects', 'about', 'contact'],
  sectionVisibility: {
    // HOME PAGE
    homeHero: true,
    homeMetaLeft: true,
    homeMetaRight: true,
    homeBottomBar: true,
    homeEmail: true,
    homePhone: true,
    homeBehance: true,
    homeEnterPortfolio: true,

    // ABOUT PAGE
    aboutHeader: true,
    aboutProfileCard: true,
    aboutBio: true,
    aboutSkillsTags: true,
    aboutStats: true,
    aboutEducation: true,
    aboutSoftware: true,
    aboutLanguages: true,
    aboutTechnical: true,
    aboutPersonal: true,
    aboutExperience: true,
    aboutAchievements: true,
    aboutCompetitions: true,

    // PROJECTS PAGE
    projectsHeader: true,
    projectsFilterBar: true,
    projectsGrid: true,

    // CONTACT PAGE
    contactHeader: true,
    contactStartProject: true,
    contactChannels: true,
    contactResumeBtn: true,

    // GLOBAL
    siteFooter: true
  },
  profile: {
    name: "MOO RENEE",
    degree: "BACHELOR IN INTERACTIVE SPATIAL DESIGN (HONS)",
    institution: "TAYLOR'S UNIVERSITY",
    years: "2024 - 2026",
    statusText: "AVAILABLE FOR COLLABORATIONS, INTERNSHIPS & CREATIVE OPPORTUNITIES",
    headline: "DESIGNING\nSYSTEMS &\nEXPERIENCES",
    shortBio: "Hi, I'm Renee — a Design student specialising in UI/UX, Visual Design, and 3D Modeling. Passionate about visual storytelling and problem-solving through design, I focus on enhancing user interactions with thoughtful storytelling techniques and intuitive digital experiences.",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=2400&auto=format&fit=crop&q=90",
    phone: "+06 10-3687393",
    email: "moorenee481@gmail.com",
    resumeUrl: "https://drive.google.com",
    resumeBtnText: "VIEW RESUME",
    behanceUrl: "https://behance.net/reneemoo",
    linktreeUrl: "https://linktr.ee/reneemoo",
    githubUrl: "https://github.com",
    instagramUrl: "https://instagram.com",
    location: "Taylor's University • Kuala Lumpur",
    coordinates: "LAT 3.0649° N, LONG 101.6167° E",
    tags: ["UI/UX", "AR/VR", "GAME DESIGN", "3D MODELING", "PROJECTION MAPPING", "ILLUSTRATION"],
    statsLayout: "beside",
    showStats: true,
    stats: [
      { number: "6+", label: "YEARS STUDYING DESIGN" },
      { number: "17+", label: "PROJECTS COMPLETED" },
      { number: "10", label: "COMPETITIONS ENTERED" },
      { number: "7", label: "AWARDS & RECOGNITIONS" }
    ],
    software: [
      { code: "AU", name: "Audition", image: "" },
      { code: "AN", name: "Animate", image: "" },
      { code: "AE", name: "After Effects", image: "" },
      { code: "AI", name: "Illustrator", image: "" },
      { code: "DW", name: "Dreamweaver", image: "" },
      { code: "UN", name: "Unity", image: "" },
      { code: "BL", name: "Blender", image: "" },
      { code: "FG", name: "Figma", image: "" }
    ]
  },

  // Homepage Hero & Bottom Grid Bar Content (Fully editable: Images 1 & 2)
  home: {
    desByLabel: "DES. BY",
    designerName: "MOO RENEE",
    disciplineSub: "INTERACTIVE SPATIAL DESIGN\nTAYLOR'S UNIVERSITY",
    copyrightText: "©2026",
    rightDiscipline: "BACHELOR IN INTERACTIVE SPATIAL DESIGN (HONS)",
    rightYears: "2024 — 2026",
    emailText: "- MOORENEE481@GMAIL.COM",
    emailUrl: "mailto:moorenee481@gmail.com",
    phoneText: "+06 10-3687393",
    phoneUrl: "tel:+60103687393",
    behanceText: "BEHANCE.NET/RENEEMOO",
    behanceUrl: "https://behance.net/reneemoo",
    enterText: "- ENTER PORTFOLIO ->",
    enterUrl: "#projects"
  },

  // Editable Top Headers for all subpages and Contact Stage
  headers: {
    about: {
      index: "01 / ABOUT ME",
      title: "ABOUT",
      discipline: "INTERACTIVE SPATIAL DESIGN",
      description: "Background, education, capabilities and the experiences driving my practice."
    },
    projects: {
      index: "02 / VIEW PROJECT",
      title: "PROJECTS",
      discipline: "INTERACTIVE SPATIAL DESIGN",
      description: "Seventeen works across academic study, competitions and professional practice."
    },
    contact: {
      index: "03 / GET IN TOUCH",
      title: "CONTACT",
      discipline: "INTERACTIVE SPATIAL DESIGN",
      description: "Available for collaborations, internships and thoughtful creative opportunities.",
      startProjectHeading: "START A\nPROJECT",
      startProjectCallout: "Available for collaborations, freelance projects, and full-time opportunities. Let's build something meaningful together.",
      letsTalkWatermark: "LET'S\nTALK"
    }
  },

  // Main Categories & Sub-Labels Catalogs (Fully editable: add, edit, remove)
  mainCategories: ["COMPETITION", "INTERNSHIP", "ACADEMIC"],
  subLabelsList: ["3D", "UI/UX", "INSTALLATION", "AR / VR", "GAME", "PROJECTION", "PRODUCT", "ILLUSTRATION"],

  about: {
    education: [
      {
        years: "2017-2022",
        title: "Tenby International School Setia EcoHill",
        subtitle: "",
        cgpa: ""
      },
      {
        years: "2022-2023",
        title: "Foundation in Design",
        subtitle: "Taylor's College",
        cgpa: "CGPA 3.67"
      },
      {
        years: "2023-2026",
        title: "Bachelor in Interactive Spatial Design (Hons)",
        subtitle: "Taylor's University",
        cgpa: "CGPA 3.79"
      }
    ],

    software: [
      { name: "Audition", code: "AU", image: "" },
      { name: "Animate", code: "AN", image: "" },
      { name: "After Effects", code: "AE", image: "" },
      { name: "Illustrator", code: "AI", image: "" },
      { name: "Dreamweaver", code: "DW", image: "" },
      { name: "Unity", code: "UN", image: "" },
      { name: "Blender", code: "BL", image: "" },
      { name: "Figma", code: "FG", image: "" }
    ],

    languages: [
      { language: "Chinese", proficiency: "NATIVE" },
      { language: "English", proficiency: "FLUENT" },
      { language: "Malay", proficiency: "CONVERSATIONAL" }
    ],

    technicalSkills: [
      "UI/UX DESIGN",
      "GAME DESIGN",
      "AR/VR DEVELOPMENT",
      "GRAPHIC DESIGN",
      "CODING",
      "3D MODELING"
    ],

    personalSkills: [
      "TEAMWORK",
      "CREATIVITY",
      "TIME MANAGEMENT",
      "RESPONSIBILITY",
      "WILLINGNESS TO LEARN",
      "ORGANIZATION"
    ],

    experience: [
      {
        type: "INTERNSHIP",
        role: "Visual Experience Designer",
        company: "Virtualtech Frontier (VTF)",
        description: "Specialized in 3D spatial environments, interactive asset modeling, and XR experiences."
      }
    ],

    achievements: [
      { title: "Terang Competition 2025", award: "FINALIST" },
      { title: "Superior Culture Competition", award: "SILVER" },
      { title: "AR Fest KL", award: "TOP 05" },
      { title: "Pre U Logo Proposal", award: "TOP 10" },
      { title: "Taylor's University", award: "DEAN'S LIST" },
      { title: "Tian Yan Cup", award: "EXCELLENCE AWARD" },
      { title: "Cross-Strait Pin Art Exhibition", award: "DISTINCTION" }
    ],

    competitions: [
      { year: "2025", name: "Tenang Projection Mapping Competition" },
      { year: "2025", name: "Superior Culture | Black and White Painting Competition" },
      { year: "2024", name: "D-Zone (Event Crew)" },
      { year: "2024", name: "XR Jam 2024 / Mental Health" },
      { year: "2024", name: "AR Fest KL / Instagram Wall Painting Filter" },
      { year: "2024", name: "Taiwan International Student Design Competition / Product Design" },
      { year: "2024", name: "Design For Change 2024 Singapore / Sustainability in Healthcare" },
      { year: "2023", name: "Pre U Foundation in Design Logo Proposal" },
      { year: "2022", name: "Tian Yan Cup International Cartoon Competition / Illustration" },
      { year: "2020", name: "Cross-Strait Pin Art Exhibition / Illustration" }
    ],
    columnTitles: {
      education: "EDUCATION",
      software: "SOFTWARE",
      languages: "LANGUAGE",
      technical: "TECHNICAL",
      personal: "PERSONAL",
      experience: "EXPERIENCE",
      achievements: "ACHIEVEMENTS",
      competitions: "COMPETITIONS & EXTRACURRICULAR"
    },
    sectionSettings: {
      education: { title: "Education", code: "01", enabled: true },
      software: { title: "Software", code: "02", enabled: true },
      languages: { title: "Language", code: "03", enabled: true },
      technicalSkills: { title: "Technical", code: "04", enabled: true },
      personalSkills: { title: "Personal", code: "05", enabled: true },
      experience: { title: "Experience", code: "06", enabled: true },
      achievements: { title: "Achievements", code: "07", enabled: true },
      competitions: { title: "Competitions & Extracurricular", code: "08", enabled: true }
    },
    customSections: []
  },

  // Project Catalog Categories & Sections (Fully customizable: add, edit, remove, reorder)
  projectSections: [
    { id: "cat_academic", key: "academic", title: "ACADEMIC PROJECTS", code: "02 — A", description: "University studio projects and academic explorations" },
    { id: "cat_competition", key: "competition", title: "COMPETITION PROJECTS", code: "02 — B", description: "Design competitions and hackathon submissions" },
    { id: "cat_internship", key: "internship", title: "INTERNSHIP PROJECTS", code: "02 — C", description: "Industry internships and professional practice" }
  ],

  // Complete set of 17 works matching the user's reference sheets
  projects: [
    // --- 01 to 09: ACADEMIC PROJECTS ---
    {
      id: "p1",
      index: "01",
      title: "When the Ocean Breathes",
      aliases: [
        "When the Ocean Breathes",
        "Where the Demon Breathes",
        "Where the Ocean Breathes",
        "Ocean Breath"
      ],
      keywords: [
        "ocean",
        "ocean breath",
        "when the ocean breath",
        "where the ocean breathes",
        "breath",
        "breathe",
        "breathing",
        "demon",
        "demon breathes",
        "sound sculpture",
        "installation",
        "breath dynamics",
        "respiration",
        "light chamber"
      ],
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "INSTALLATION",
      subLabels: ["INSTALLATION", "3D", "PROJECTION", "ILLUSTRATION"],
      tag: "INSTALLATION",
      date: "2025",
      coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2400&auto=format&fit=crop&q=90",
      labels: ["INSTALLATION", "3D", "PROJECTION", "ILLUSTRATION"],
      shortDescription: "Interactive spatial installation exploring the threshold between darkness and breath dynamics through responsive lighting sensors and sound sculptures.",
      fullDescription: "Where the Demon Breathes is an immersive sensory installation exploring spatial threshold mythology. Ambient sensors detect participant breath cycles and proximity, dynamically manipulating localized acoustic reverberation and organic pneumatic light sculptures.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2400&auto=format&fit=crop&q=90", caption: "Installation View 01 — Spatial light chamber" },
        { url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=2400&auto=format&fit=crop&q=90", caption: "Installation View 02 — Pneumatic lung response" },
        { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2400&auto=format&fit=crop&q=90", caption: "Installation View 03 — Acoustic field schematic" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "PROJECT DOCUMENTATION", url: "https://behance.net/reneemoo" },
        { title: "EXHIBITION PHOTO ARCHIVE", url: "https://behance.net/reneemoo" }
      ],
      gallery: [
        {
          url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=2400&auto=format&fit=crop&q=90",
          text: "Acoustic sensor array calibration & spatial testing"
        }
      ],
      customSections: [
        {
          id: "sec_p1_01",
          title: "RESEARCH & SPATIAL BLUEPRINTS",
          contentType: "mixed",
          text: "The initial investigation centered on sonic wave reflections within enclosed timber volumes. We mapped acoustic dampening across 16 geometric configurations to synthesize breath-rate resonance.",
          imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=2400&auto=format&fit=crop&q=90",
          imageCaption: "Figure 1.1: Spatial Acoustic Field Calibration & Sensor Node Layout",
          linkText: "VIEW RESEARCH WHITE PAPER",
          linkUrl: "https://behance.net/reneemoo",
          linkMode: "embed",
          autoScroll: true,
          autoScrollSpeed: 1,
          embedHeight: 620
        }
      ]
    },
    {
      id: "p2",
      index: "02",
      title: "QuickSight",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "UI/UX",
      subLabels: ["UI/UX", "DIGITAL"],
      tag: "ART APPLICATION",
      date: "2025",
      coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=2400&auto=format&fit=crop&q=90",
      labels: ["ART APPLICATION", "UI/UX", "REACT"],
      shortDescription: "A high-performance visual coding canvas and digital toolset built for rapid iterative spatial design explorations.",
      fullDescription: "QuickSight bridges generative digital logic and creative intuition. The application enables designers to manipulate generative shader arrays, test color gamut harmonies in real-time, and export responsive parametric geometry directly into production rendering engines.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=2400&auto=format&fit=crop&q=90", caption: "QuickSight Workspace Interface" },
        { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2400&auto=format&fit=crop&q=90", caption: "Real-time Parametric Shader Node Graph" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "GITHUB REPOSITORY", url: "https://github.com" },
        { title: "LIVE APPLICATION DEMO", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p3",
      index: "03",
      title: "Quest for the Scattered Crystal",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "GAME",
      subLabels: ["3D", "GAME"],
      tag: "GAME DESIGN",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=2400&auto=format&fit=crop&q=90",
      labels: ["GAME DESIGN", "UNITY", "3D MODELING"],
      shortDescription: "Atmospheric 3D puzzle-adventure game centering on non-Euclidean perspective shifts and harmonic spatial acoustics.",
      fullDescription: "In Quest for the Scattered Crystal, players traverse ancient mineral ruins where architectural scale is determined by visual perspective. Navigating through recursive chambers requires realigning geometric shadows to activate resonant crystal frequencies.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=2400&auto=format&fit=crop&q=90", caption: "Level 01 — Crystal Spires at Dusk" },
        { url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=2400&auto=format&fit=crop&q=90", caption: "Level 02 — Shifting Gravitational Hall" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "PLAY GAMEPLAY DEMO", url: "https://itch.io" },
        { title: "LEVEL BLUEPRINTS", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p4",
      index: "04",
      title: "MOJAY",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "UI/UX",
      subLabels: ["UI/UX"],
      tag: "APPLICATION",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=2400&auto=format&fit=crop&q=90",
      labels: ["APPLICATION", "UI/UX", "FIGMA"],
      shortDescription: "A thoughtful wellness and spatial habit-tracking mobile application designed with tactile micro-interactions and soothing visual rhythms.",
      fullDescription: "MOJAY reimagines mobile user experiences through empathetic design. Rather than demanding continuous attention, it employs ambient color shifts and gentle spatial card transitions that encourage mindful daily reflection.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=2400&auto=format&fit=crop&q=90", caption: "MOJAY Design System & Flow" },
        { url: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=2400&auto=format&fit=crop&q=90", caption: "Micro-interaction Detail Sheets" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "FIGMA PROTOTYPE", url: "https://figma.com" },
        { title: "UI CASE STUDY", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p5",
      index: "05",
      title: "Deline Album",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "UI/UX",
      subLabels: ["UI/UX"],
      tag: "WEBSITE DESIGN",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2400&auto=format&fit=crop&q=90",
      labels: ["WEBSITE DESIGN", "FRONT-END", "EDITORIAL"],
      shortDescription: "A minimalist digital archive and music album visualizer with fluid typography and interactive vinyl-style disc navigation.",
      fullDescription: "Deline Album explores modern web typography as an interactive musical instrument. Readers glide through track stems and lyrical prose while dynamic background gradations react to tempo and audio frequencies.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2400&auto=format&fit=crop&q=90", caption: "Editorial Visualizer Spread" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "LIVE WEBSITE", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p6",
      index: "06",
      title: "Entangled World",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "PROJECTION",
      subLabels: ["3D", "PROJECTION"],
      tag: "PROJECTION MAPPING",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=2400&auto=format&fit=crop&q=90",
      labels: ["PROJECTION MAPPING", "BLENDER", "TOUCHDESIGNER"],
      shortDescription: "Immersive architectural projection mapping installation tracing ecological symbiosis and human-nature convergence.",
      fullDescription: "Entangled World wraps architectural interior surfaces in fluid bioluminescent root systems. Using TouchDesigner audio reactivity and Blender 3D simulations, the piece investigates nature reclaiming urban infrastructure.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=2400&auto=format&fit=crop&q=90", caption: "Surface Projection Mapping Calibration" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "DOCUMENTATION VIDEO", url: "https://youtube.com" }
      ],
      gallery: []
    },
    {
      id: "p7",
      index: "07",
      title: "Aura Gallery",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "AR / VR",
      subLabels: ["3D", "AR / VR"],
      tag: "METAVERSE",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=2400&auto=format&fit=crop&q=90",
      labels: ["METAVERSE", "AR / VR", "BLENDER"],
      shortDescription: "A virtual spatial art pavilion constructed in the metaverse for decentralized exhibitions and spatial audio performances.",
      fullDescription: "Aura Gallery eliminates physical spatial constraints to showcase digital sculptures. The pavilion features curved translucent light chambers, ambient generative acoustics, and seamless multi-user spatial presence.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=2400&auto=format&fit=crop&q=90", caption: "Aura Pavilion Exterior Render" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "VIRTUAL TOUR", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p8",
      index: "08",
      title: "Physiotherapy Center",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "AR / VR",
      subLabels: ["3D", "AR / VR"],
      tag: "METAVERSE",
      date: "2023",
      coverImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=2400&auto=format&fit=crop&q=90",
      labels: ["METAVERSE", "HEALTHCARE", "SPATIAL DESIGN"],
      shortDescription: "Therapeutic spatial metaverse environment crafted for post-injury physical rehabilitation through gamified movement.",
      fullDescription: "Designed to make physical therapy engaging and accessible, this environment provides calibrated spatial markers that guide patient motor exercises in a tranquil biophilic setting.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=2400&auto=format&fit=crop&q=90", caption: "Ergonomic Rehab Zone Model" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "CASE STUDY", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p9",
      index: "09",
      title: "Illustration & Visual Narrative",
      category: "academic",
      mainSection: "ACADEMIC",
      discipline: "ILLUSTRATION",
      subLabels: ["ILLUSTRATION"],
      tag: "ILLUSTRATION",
      date: "2023",
      coverImage: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=2400&auto=format&fit=crop&q=90",
      labels: ["ILLUSTRATION", "EDITORIAL", "STORYTELLING"],
      shortDescription: "A series of conceptual editorial illustrations exploring human perception, memory fragments, and urban solitude.",
      fullDescription: "Visual storytelling anthology rendered with precision linework and expressive monochromatic gradients, documenting personal reflections on growth and identity.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=2400&auto=format&fit=crop&q=90", caption: "Editorial Plate 01 — Memory Fragments" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "SERIES PORTFOLIO", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },

    // --- 10 to 15: COMPETITION PROJECTS ---
    {
      id: "p10",
      index: "10",
      title: "Wonder Window",
      category: "competition",
      mainSection: "COMPETITION",
      discipline: "AR / VR",
      subLabels: ["3D", "AR / VR"],
      tag: "AR FILTER",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=2400&auto=format&fit=crop&q=90",
      labels: ["AR FILTER", "SPARK AR", "COMPETITION"],
      shortDescription: "AR Fest KL Instagram wall painting filter creating a portal through historical murals into vibrant 3D animated worlds.",
      fullDescription: "Selected for AR Fest KL, Wonder Window allows pedestrians to scan urban wall murals, watching them dissolve into an interactive kinetic gateway with 3D spatial soundscapes.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=2400&auto=format&fit=crop&q=90", caption: "AR Portal Activation on Street Wall" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "TRY AR FILTER ON INSTAGRAM", url: "https://instagram.com" },
        { title: "AR FEST KL COMPETITION ENTRY", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p11",
      index: "11",
      title: "PIZ DI",
      aliases: ["PIZ DI Mental Health Game", "XR Jam PIZ DI"],
      keywords: ["xr jam", "mental health", "mixed reality", "breathing", "breath exercises", "meditation", "puzzle", "unity", "mr game"],
      category: "competition",
      mainSection: "COMPETITION",
      discipline: "GAME",
      subLabels: ["3D", "GAME"],
      tag: "MR GAME",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2400&auto=format&fit=crop&q=90",
      labels: ["MR GAME", "UNITY", "XR JAM"],
      shortDescription: "XR Jam 2024 Mental Health mixed reality game centering on cognitive decluttering and meditative spatial coordination.",
      fullDescription: "PIZ DI blends physical room awareness with augmented puzzle mechanics. Players arrange floating kinetic shards in synchronization with rhythmic breathing exercises to restore harmony to their space.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2400&auto=format&fit=crop&q=90", caption: "MR Spatial Play Boundary Setup" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "XR JAM SUBMISSION", url: "https://itch.io" }
      ],
      gallery: []
    },
    {
      id: "p12",
      index: "12",
      title: "RE : AD",
      category: "competition",
      mainSection: "COMPETITION",
      discipline: "PRODUCT",
      subLabels: ["3D", "PRODUCT"],
      tag: "PRODUCT DESIGN",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1581291518655-9523c932deda?w=2400&auto=format&fit=crop&q=90",
      labels: ["PRODUCT DESIGN", "SUSTAINABILITY", "HEALTHCARE"],
      shortDescription: "Taiwan International Student Design Competition entry featuring sustainable modular medical hardware.",
      fullDescription: "RE : AD tackles medical single-use waste by introducing an ergonomically contoured, sterilizable modular dispenser unit built with circular biomaterials for clinics across developing regions.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1581291518655-9523c932deda?w=2400&auto=format&fit=crop&q=90", caption: "RE : AD Industrial CAD exploded view" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "COMPETITION SUBMISSION BOARD", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p13",
      index: "13",
      title: "City 37°C",
      category: "competition",
      mainSection: "COMPETITION",
      discipline: "PROJECTION",
      subLabels: ["PROJECTION", "INSTALLATION"],
      tag: "PROJECTION MAPPING",
      date: "2025",
      coverImage: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=2400&auto=format&fit=crop&q=90",
      labels: ["PROJECTION MAPPING", "BDG LIGHT", "URBAN"],
      shortDescription: "BDG Light Competition projection mapping visualizing urban thermal heat islands across Southeast Asian metropolises.",
      fullDescription: "City 37°C translates satellite thermal imaging into an evocative projection mapping experience on concrete building surfaces, highlighting urgent conversations around urban deforestation.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=2400&auto=format&fit=crop&q=90", caption: "Thermal Simulation Mapping Render" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "COMPETITION OVERVIEW", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p14",
      index: "14",
      title: "Cheer Mori Cheer",
      category: "competition",
      mainSection: "COMPETITION",
      discipline: "PROJECTION",
      subLabels: ["PROJECTION", "INSTALLATION"],
      tag: "PROJECTION MAPPING",
      date: "2025",
      coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=2400&auto=format&fit=crop&q=90",
      labels: ["PROJECTION MAPPING", "TERANG", "FINALIST"],
      shortDescription: "Terang Projection Mapping Competition Finalist installation celebrating joy, cultural heritage, and shared communal light.",
      fullDescription: "A vibrant audiovisual celebration projected onto heritage architecture. Cheer Mori Cheer received the Finalist accolade at the 2025 Terang Competition for its energetic choreography and expressive color gradients.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=2400&auto=format&fit=crop&q=90", caption: "Terang Competition Live Showcase" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "TERANG FESTIVAL HIGHLIGHTS", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p15",
      index: "15",
      title: "Illustration Compilation",
      category: "competition",
      mainSection: "COMPETITION",
      discipline: "ILLUSTRATION",
      subLabels: ["ILLUSTRATION"],
      tag: "ILLUSTRATION",
      date: "2022",
      coverImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=2400&auto=format&fit=crop&q=90",
      labels: ["ILLUSTRATION", "TIAN YAN CUP", "EXCELLENCE"],
      shortDescription: "Excellence Award & Distinction winning cartoon illustrations from Tian Yan Cup and Cross-Strait Pin Art exhibitions.",
      fullDescription: "Curated collection of award-winning traditional and digital illustrations exploring youth, resilience, and whimsical dreamscapes recognized by international youth art committees.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=2400&auto=format&fit=crop&q=90", caption: "Award-Winning Exhibition Plate" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "VIEW FULL ART BOOK", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },

    // --- 16 to 17: INTERNSHIP PROJECTS ---
    {
      id: "p16",
      index: "16",
      title: "MOS Mythictolspace",
      category: "internship",
      mainSection: "INTERNSHIP",
      discipline: "DIGITAL",
      subLabels: ["3D", "UI/UX"],
      tag: "SOCIAL MEDIA POST",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=2400&auto=format&fit=crop&q=90",
      labels: ["SOCIAL MEDIA POST", "3D MODELING", "VTF"],
      shortDescription: "Social media visual branding campaigns and 3D icon design developed during internship at Virtualtech Frontier.",
      fullDescription: "Created high-engagement 3D visual assets, promotional motion banners, and campaign imagery for Virtualtech Frontier's flagship virtual events and digital spatial experiences.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=2400&auto=format&fit=crop&q=90", caption: "3D App Ecosystem Campaign Assets" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "VIRTUALTECH FRONTIER", url: "https://virtualtechfrontier.com" },
        { title: "CAMPAIGN METRICS", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    },
    {
      id: "p17",
      index: "17",
      title: "AUK Technical Training 2024",
      category: "internship",
      mainSection: "INTERNSHIP",
      discipline: "INSTALLATION",
      subLabels: ["INSTALLATION"],
      tag: "PHOTO PROP",
      date: "2024",
      coverImage: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=2400&auto=format&fit=crop&q=90",
      labels: ["PHOTO PROP", "FABRICATION", "EVENT"],
      shortDescription: "Physical event branding, spatial photo prop fabrication, and technical staging for AUK corporate training 2024.",
      fullDescription: "Designed and supervised spatial fabrication of interactive photo props, stage backdrops, and wayfinding signage for the AUK Technical Training 2024 gathering.",
      hasGap: false,
      autoScrollImages: true,
      images: [
        { url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=2400&auto=format&fit=crop&q=90", caption: "Event Staging & Photo Prop Installation" }
      ],
      videoUrl: "",
      relatedLinks: [
        { title: "EVENT ALBUM", url: "https://behance.net/reneemoo" }
      ],
      gallery: []
    }
  ]
};

// Native IndexedDB Helper
function openIDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function idbSet(key, data) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.put({ id: key, data });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

/**
 * Fast Code Checksum Fingerprint Helper
 * Detects when the developer edits database.js directly in code so the browser
 * automatically syncs without being held back by stale IndexedDB cache.
 */
function computeCodeFingerprint(obj) {
  try {
    const s = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + (hash >>> 0);
  } catch(e) {
    return 'fp_default';
  }
}

/**
 * Database Management Class
 */
class PortfolioDatabase {
  constructor() {
    this.listeners = [];
    this.firestore = null;
    this.isCloudEnabled = false;
    this.cloudProjectId = null;
    this.cloudUnsubscribe = null;

    // 1. FAST-BOOT: Instantly populate memoryData synchronously from local storage or default dataset (0ms)
    // This allows getData() and the entire website to render in 0.001 seconds without waiting for the internet!
    try {
      let initialCached = null;
      // 1. Check DB_KEY first (permanent saved data)
      const localStr = localStorage.getItem(DB_KEY);
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          if (parsed && parsed.profile && Array.isArray(parsed.projects)) {
            initialCached = parsed;
          }
        } catch(e) {}
      }

      // 2. Only check DRAFT_KEY if it is strictly newer than saved data
      const draftStr = localStorage.getItem(DRAFT_KEY) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(DRAFT_KEY) : null);
      if (draftStr) {
        try {
          const parsedDraft = JSON.parse(draftStr);
          if (parsedDraft && parsedDraft.profile && Array.isArray(parsedDraft.projects)) {
            const draftUp = parsedDraft._lastUpdated || 0;
            const curUp = (initialCached && initialCached._lastUpdated) || DEFAULT_PORTFOLIO_DATA._lastUpdated || 0;
            if (draftUp > curUp) {
              initialCached = parsedDraft;
            }
          }
        } catch(e) {}
      }

      this.memoryData = this._ensureSchemaIntegrity(initialCached || DEFAULT_PORTFOLIO_DATA);
    } catch(e) {
      this.memoryData = this._ensureSchemaIntegrity(DEFAULT_PORTFOLIO_DATA);
    }

    this.isInitialized = false;
    this.initCloud();
    this.initPromise = this.init().finally(() => {
      this.isInitialized = true;
    });

    // BroadcastChannel for instant cross-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('moo_renee_sync');
        this.channel.onmessage = (e) => {
          if (e.data && (e.data.type === 'DATA_UPDATED' || e.data.type === 'DATA_DRAFT_UPDATED')) {
            this.memoryData = this._ensureSchemaIntegrity(e.data.payload);
            this.notifyListeners();
          }
        };
      } catch (err) {}
    }

    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if ((e.key === DRAFT_KEY || e.key === DB_KEY) && e.newValue) {
        try {
          this.memoryData = this._ensureSchemaIntegrity(JSON.parse(e.newValue));
          this.notifyListeners();
        } catch (err) {}
      }
    });
  }

  _ensureSchemaIntegrity(data) {
    if (!data) return data;

    // Helper to auto-upgrade Unsplash image URLs to crisp 2400px Retina quality
    const upgradeImgUrl = (url, targetWidth = 2400) => {
      if (!url || typeof url !== 'string') return url;
      if (url.includes('images.unsplash.com')) {
        return url.replace(/w=\d+/, `w=${targetWidth}`).replace(/q=\d+/, 'q=90');
      }
      return url;
    };

    // Admin Authentication Credentials schema
    if (!data.adminAuth) {
      data.adminAuth = {
        username: "RENEE@MOO081706",
        password: "36987@RENEE6667"
      };
    } else {
      data.adminAuth.username = (data.adminAuth.username || "RENEE@MOO081706").trim();
      data.adminAuth.password = (data.adminAuth.password || "36987@RENEE6667").trim();
    }

    // Page Visibility schema
    if (!data.pageVisibility) {
      data.pageVisibility = { home: true, about: true, projects: true, contact: true };
    } else {
      data.pageVisibility = Object.assign({ home: true, about: true, projects: true, contact: true }, data.pageVisibility);
    }

    // Page Order schema (Flexible sequencing of pages)
    if (!Array.isArray(data.pageOrder) || data.pageOrder.length === 0) {
      data.pageOrder = [...DEFAULT_PORTFOLIO_DATA.pageOrder];
    } else {
      ['home', 'projects', 'about', 'contact'].forEach(pk => {
        if (!data.pageOrder.includes(pk)) data.pageOrder.push(pk);
      });
    }

    // Section Visibility schema (Fine-grained control over any section)
    if (!data.sectionVisibility || typeof data.sectionVisibility !== 'object') {
      data.sectionVisibility = Object.assign({}, DEFAULT_PORTFOLIO_DATA.sectionVisibility);
    } else {
      data.sectionVisibility = Object.assign({}, DEFAULT_PORTFOLIO_DATA.sectionVisibility, data.sectionVisibility);
    }

    // Sync Section Visibility with profile & about sectionSettings for backwards compatibility
    if (data.profile) {
      if (data.sectionVisibility.aboutStats !== undefined) {
        data.profile.showStats = data.sectionVisibility.aboutStats;
      } else if (data.profile.showStats !== undefined) {
        data.sectionVisibility.aboutStats = data.profile.showStats;
      }
    }
    if (data.about && data.about.sectionSettings) {
      const secKeys = [
        ['aboutEducation', 'education'],
        ['aboutSoftware', 'software'],
        ['aboutLanguages', 'languages'],
        ['aboutTechnical', 'technicalSkills'],
        ['aboutPersonal', 'personalSkills'],
        ['aboutExperience', 'experience'],
        ['aboutAchievements', 'achievements'],
        ['aboutCompetitions', 'competitions']
      ];
      secKeys.forEach(([svKey, ssKey]) => {
        if (data.sectionVisibility[svKey] !== undefined && data.about.sectionSettings[ssKey]) {
          data.about.sectionSettings[ssKey].enabled = data.sectionVisibility[svKey];
        } else if (data.about.sectionSettings[ssKey] && data.about.sectionSettings[ssKey].enabled !== undefined) {
          data.sectionVisibility[svKey] = data.about.sectionSettings[ssKey].enabled;
        }
      });
    }

    // Headers schema
    if (!data.headers) {
      data.headers = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.headers));
    } else {
      data.headers.about = Object.assign({}, DEFAULT_PORTFOLIO_DATA.headers.about, data.headers.about || {});
      data.headers.projects = Object.assign({}, DEFAULT_PORTFOLIO_DATA.headers.projects, data.headers.projects || {});
      data.headers.contact = Object.assign({}, DEFAULT_PORTFOLIO_DATA.headers.contact, data.headers.contact || {});
    }

    // Profile schema
    if (!data.profile) {
      data.profile = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.profile));
    } else {
      if (data.profile.resumeUrl === undefined) {
        data.profile.resumeUrl = (DEFAULT_PORTFOLIO_DATA.profile && DEFAULT_PORTFOLIO_DATA.profile.resumeUrl) || 'https://drive.google.com';
      }
      if (data.profile.resumeBtnText === undefined) {
        data.profile.resumeBtnText = (DEFAULT_PORTFOLIO_DATA.profile && DEFAULT_PORTFOLIO_DATA.profile.resumeBtnText) || 'VIEW RESUME';
      }
      if (data.profile.showStats === undefined) {
        data.profile.showStats = true;
      }
    }

    // Homepage Hero & Bottom Bar schema
    if (!data.home) {
      data.home = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.home));
    } else {
      data.home = Object.assign({}, DEFAULT_PORTFOLIO_DATA.home, data.home);
    }

    // Main Categories & Sub-Labels schema
    if (!Array.isArray(data.mainCategories) || data.mainCategories.length === 0) {
      data.mainCategories = [...DEFAULT_PORTFOLIO_DATA.mainCategories];
    }
    if (!Array.isArray(data.subLabelsList) || data.subLabelsList.length === 0) {
      data.subLabelsList = [...DEFAULT_PORTFOLIO_DATA.subLabelsList];
    }

    if (!data.projectSections || !Array.isArray(data.projectSections) || data.projectSections.length === 0) {
      data.projectSections = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.projectSections));
    }
    if (!data.about) data.about = {};
    if (!data.about.sectionSettings) {
      data.about.sectionSettings = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.sectionSettings));
    }
    if (!data.about.columnTitles) {
      data.about.columnTitles = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.columnTitles));
    } else {
      data.about.columnTitles = Object.assign({}, DEFAULT_PORTFOLIO_DATA.about.columnTitles, data.about.columnTitles);
    }
    if (!Array.isArray(data.about.customSections)) {
      data.about.customSections = [];
    } else {
      data.about.customSections.forEach((cs, i) => {
        if (!cs.id) cs.id = 'custom_sec_' + (i + 1);
        if (!cs.column) cs.column = 'auto';
        if (!cs.style) cs.style = 'timeline';
        if (!Array.isArray(cs.items)) cs.items = [];
      });
    }

    if (!Array.isArray(data.about.software)) {
      data.about.software = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.software));
    } else {
      data.about.software.forEach(s => {
        if (s && s.image === undefined) s.image = '';
        if (s && s.code) s.code = s.code.toUpperCase();
      });
    }

    if (!Array.isArray(data.about.technicalSkills)) {
      data.about.technicalSkills = [...DEFAULT_PORTFOLIO_DATA.about.technicalSkills];
    }
    if (!Array.isArray(data.about.personalSkills)) {
      data.about.personalSkills = [...DEFAULT_PORTFOLIO_DATA.about.personalSkills];
    }
    if (!Array.isArray(data.about.experience)) {
      data.about.experience = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.experience));
    }
    if (!Array.isArray(data.about.achievements)) {
      data.about.achievements = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.achievements));
    }
    if (!Array.isArray(data.about.competitions)) {
      data.about.competitions = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.competitions));
    }
    if (!Array.isArray(data.about.languages)) {
      data.about.languages = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.languages));
    }
    if (!Array.isArray(data.about.education)) {
      data.about.education = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.about.education));
    } else {
      data.about.education.forEach(e => {
        if (e.years) e.years = e.years.replace(/\s*-\s*/, '-');
        if (e.title && e.title.includes('Bachelor') && !e.cgpa) {
          e.cgpa = 'CGPA 3.79';
        }
      });
    }

    if (!data.profile) data.profile = {};
    if (!Array.isArray(data.profile.stats)) {
      data.profile.stats = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA.profile.stats));
    }
    if (Array.isArray(data.projects)) {
      const defaultMap = {};
      DEFAULT_PORTFOLIO_DATA.projects.forEach(dp => {
        defaultMap[dp.id] = dp;
      });

      data.projects.forEach(p => {
        const d = defaultMap[p.id] || {};
        if (!p.mainSection) {
          const cat = (p.category || (p.categories && p.categories[0]) || d.category || 'academic').toLowerCase();
          if (cat.includes('compet')) p.mainSection = 'COMPETITION';
          else if (cat.includes('intern')) p.mainSection = 'INTERNSHIP';
          else p.mainSection = 'ACADEMIC';
        }
        if (!Array.isArray(p.subLabels) || p.subLabels.length === 0) {
          if (d.subLabels && d.subLabels.length > 0) {
            p.subLabels = [...d.subLabels];
          } else {
            const detected = [];
            const allStr = `${p.discipline || ''} ${(p.labels || []).join(' ')} ${p.tag || ''}`.toUpperCase();
            if (allStr.includes('ILLUSTRAT')) detected.push('ILLUSTRATION');
            if (allStr.includes('3D') || allStr.includes('BLENDER') || allStr.includes('METAVERSE')) detected.push('3D');
            if (allStr.includes('UI/UX') || allStr.includes('FIGMA') || allStr.includes('WEBSITE') || allStr.includes('APPLICATION')) detected.push('UI/UX');
            if (allStr.includes('INSTALLATION') || allStr.includes('PROP')) detected.push('INSTALLATION');
            if (allStr.includes('AR') || allStr.includes('VR') || allStr.includes('XR')) detected.push('AR / VR');
            if (allStr.includes('GAME')) detected.push('GAME');
            if (allStr.includes('PROJECTION')) detected.push('PROJECTION');
            if (allStr.includes('PRODUCT')) detected.push('PRODUCT');
            p.subLabels = detected.length > 0 ? detected : [p.discipline || 'PROJECT'];
          }
        }
        if (p.coverImage) p.coverImage = upgradeImgUrl(p.coverImage, 2400);
        p.videoUrl = p.videoUrl || '';
        p.aliases = Array.isArray(p.aliases) ? p.aliases : (d && Array.isArray(d.aliases) ? [...d.aliases] : []);
        p.keywords = Array.isArray(p.keywords) ? p.keywords : (d && Array.isArray(d.keywords) ? [...d.keywords] : []);
        p.relatedLinks = Array.isArray(p.relatedLinks) ? p.relatedLinks : [];
        p.images = Array.isArray(p.images) ? p.images.map(img => {
          if (typeof img === 'string') return upgradeImgUrl(img, 2400);
          if (img && img.url) img.url = upgradeImgUrl(img.url, 2400);
          return img;
        }) : [];
        p.gallery = Array.isArray(p.gallery) ? p.gallery.map(g => {
          if (typeof g === 'string') return { url: upgradeImgUrl(g, 2000), text: '' };
          return {
            url: upgradeImgUrl((g && g.url) || '', 2000),
            text: (g && (g.text !== undefined ? g.text : g.caption)) || ''
          };
        }) : [];
        p.customSections = Array.isArray(p.customSections) ? p.customSections : [];
        p.customSections.forEach((cs, cIdx) => {
          if (cs.imageUrl) cs.imageUrl = upgradeImgUrl(cs.imageUrl, 2400);
          if (!cs.id) cs.id = `sec_${p.id || 'p'}_${cIdx + 1}`;
          if (!cs.linkMode || cs.linkMode === 'button') cs.linkMode = 'embed';
          if (cs.autoScroll === undefined) cs.autoScroll = true;
          if (!cs.autoScrollSpeed) cs.autoScrollSpeed = 1;
          if (!cs.embedHeight) cs.embedHeight = 620;
        });
      });
    }

    if (data.profile && data.profile.photoUrl) {
      data.profile.photoUrl = upgradeImgUrl(data.profile.photoUrl, 1200);
    }
    return data;
  }

  // Merges cloud data into local data without degrading high-res images that exist locally
  _mergePreservingHighResImages(localData, incomingData) {
    if (!localData || !incomingData) return incomingData || localData;
    const merged = JSON.parse(JSON.stringify(incomingData));

    // Preserve high-res profile photo if local copy has higher byte-count (higher resolution)
    if (localData.profile && localData.profile.photoUrl && merged.profile && merged.profile.photoUrl) {
      if (localData.profile.photoUrl.startsWith('data:image') &&
          localData.profile.photoUrl.length > merged.profile.photoUrl.length) {
        merged.profile.photoUrl = localData.profile.photoUrl;
      }
    }

    // Preserve high-res project covers, continuous showcase slices, and gallery exhibits
    if (Array.isArray(localData.projects) && Array.isArray(merged.projects)) {
      const localMap = {};
      localData.projects.forEach(lp => { if (lp && lp.id) localMap[lp.id] = lp; });

      merged.projects.forEach(mp => {
        if (!mp || !mp.id) return;
        const lp = localMap[mp.id];
        if (!lp) return;

        // Preserve high-res coverImage
        if (lp.coverImage && mp.coverImage &&
            lp.coverImage.startsWith('data:image') &&
            lp.coverImage.length > mp.coverImage.length) {
          mp.coverImage = lp.coverImage;
        }

        // Preserve high-res showcase slices
        if (Array.isArray(lp.images) && Array.isArray(mp.images)) {
          mp.images.forEach((mImg, idx) => {
            const lImg = lp.images[idx];
            if (!mImg || !lImg) return;
            const mUrl = typeof mImg === 'string' ? mImg : (mImg.url || '');
            const lUrl = typeof lImg === 'string' ? lImg : (lImg.url || '');
            if (lUrl.startsWith('data:image') && lUrl.length > mUrl.length) {
              if (typeof mImg === 'string') {
                mp.images[idx] = lUrl;
              } else {
                mImg.url = lUrl;
              }
            }
          });
        }

        // Preserve high-res gallery
        if (Array.isArray(lp.gallery) && Array.isArray(mp.gallery)) {
          mp.gallery.forEach((mGal, idx) => {
            const lGal = lp.gallery[idx];
            if (!mGal || !lGal) return;
            const mUrl = typeof mGal === 'string' ? mGal : (mGal.url || '');
            const lUrl = typeof lGal === 'string' ? lGal : (lGal.url || '');
            if (lUrl.startsWith('data:image') && lUrl.length > mUrl.length) {
              if (typeof mGal === 'string') {
                mp.gallery[idx] = lUrl;
              } else {
                mGal.url = lUrl;
              }
            }
          });
        }

        // Preserve high-res customSections
        if (Array.isArray(lp.customSections) && Array.isArray(mp.customSections)) {
          mp.customSections.forEach((mSec, idx) => {
            const lSec = lp.customSections[idx];
            if (!mSec || !lSec) return;
            if (lSec.imageUrl && mSec.imageUrl &&
                lSec.imageUrl.startsWith('data:image') &&
                lSec.imageUrl.length > mSec.imageUrl.length) {
              mSec.imageUrl = lSec.imageUrl;
            }
          });
        }
      });
    }
    return merged;
  }

  initCloud() {
    if (typeof window === 'undefined' || !window.firebase) return;
    try {
      const defaultFirebaseConfig = {
        apiKey: "AIzaSyAyQm6hHzU8RH3xecbNUEmMMRBGRdwDySc",
        authDomain: "renee-portfolio-a301b-50a60.firebaseapp.com",
        projectId: "renee-portfolio-a301b-50a60",
        storageBucket: "renee-portfolio-a301b-50a60.firebasestorage.app",
        messagingSenderId: "258333288185",
        appId: "1:258333288185:web:9635d076a3aa66215ee428",
        measurementId: "G-L3RMZZSKTZ"
      };
      const stored = localStorage.getItem(CLOUD_CONFIG_KEY) ||
                     (window.MOO_FIREBASE_CONFIG ? JSON.stringify(window.MOO_FIREBASE_CONFIG) : null) ||
                     JSON.stringify(defaultFirebaseConfig);
      const cfg = typeof stored === 'string' ? JSON.parse(stored) : stored;
      if (cfg && cfg.apiKey && cfg.projectId) {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(cfg);
        }
        this.firestore = firebase.firestore();
        this.isCloudEnabled = true;
        this.cloudProjectId = cfg.projectId;
      }
    } catch (e) {
      console.warn('Firebase init error:', e);
    }
  }

  async init() {
    try {
      // 1. Read IndexedDB (carries high-res images and permanent local database)
      const idbData = await idbGet('current_portfolio_v3');
      if (idbData && idbData.profile && Array.isArray(idbData.projects)) {
        const idbUpdated = idbData._lastUpdated || 0;
        const currentUpdated = (this.memoryData && this.memoryData._lastUpdated) || 0;
        if (idbUpdated >= currentUpdated) {
          this.memoryData = this._ensureSchemaIntegrity(idbData);
          this.persistToLocal(this.memoryData);
          this.notifyListeners();
        }
      }

      // 2. Read LocalStorage cache if present and newer
      try {
        const localStr = localStorage.getItem(DB_KEY);
        if (localStr) {
          const parsed = JSON.parse(localStr);
          if (parsed && parsed.profile && Array.isArray(parsed.projects)) {
            const locUp = parsed._lastUpdated || 0;
            const curUp = (this.memoryData && this.memoryData._lastUpdated) || 0;
            if (locUp >= curUp) {
              this.memoryData = this._ensureSchemaIntegrity(parsed);
            }
          }
        }
      } catch (e) {}

      // 3. Fast-boot Cloud Sync: Start listener immediately
      // On all devices (new and returning), race cloud fetch with a 1500ms timeout
      // so visitor devices receive the 100% freshest cloud update BEFORE the initial render!
      if (!this.firestore) this.initCloud();
      if (this.firestore && this.isCloudEnabled) {
        this.setupCloudListener();
        try {
          await Promise.race([
            this.syncCloudInBackground(),
            new Promise(resolve => setTimeout(resolve, 1500))
          ]);
        } catch (e) {
          console.warn('Initial cloud sync notice:', e);
        }
      }

      return this.memoryData;
    } catch (err) {
      console.warn('DB initialization error, using defaults:', err);
      return this.memoryData;
    }
  }

  async syncCloudInBackground() {
    if (!this.firestore) this.initCloud();
    if (!this.firestore || !this.isCloudEnabled) return;
    try {
      const docRef = this.firestore.collection(CLOUD_COLLECTION).doc(CLOUD_DOC);
      let docSnap = null;
      // Fetch directly from server to bypass stale local Firestore cache
      try {
        docSnap = await docRef.get({ source: 'server' });
      } catch (netErr) {
        docSnap = await docRef.get();
      }
      if (docSnap && docSnap.exists) {
        const cloudPayload = docSnap.data();
        if (cloudPayload && cloudPayload.data && cloudPayload.data.profile && Array.isArray(cloudPayload.data.projects)) {
          const cloudData = this._ensureSchemaIntegrity(cloudPayload.data);
          const localUpdated = (this.memoryData && this.memoryData._lastUpdated) || 0;
          const cloudUpdated = (cloudPayload.data && cloudPayload.data._lastUpdated)
            ? Number(cloudPayload.data._lastUpdated)
            : (cloudPayload.clientTimestamp ? new Date(cloudPayload.clientTimestamp).getTime() : 0);

          const isAdminSession = typeof window !== 'undefined' && !!(sessionStorage.getItem('renee_admin_authenticated') || localStorage.getItem('renee_admin_authenticated'));
          const hasLocalEdits = isAdminSession && !!(this.memoryData && this.memoryData._savedFromAdmin);
          const isLocalNewer = hasLocalEdits && (localUpdated > (cloudUpdated + 500));

          // On visitor devices: ALWAYS apply cloud data if cloud has valid data!
          // On admin device: only preserve local edits if admin actually made newer unsynced edits
          if (!isLocalNewer || !isAdminSession) {
            console.info('[PortfolioDB] Applying freshest Cloud Firestore dataset to local memory...');
            this.memoryData = this._mergePreservingHighResImages(this.memoryData, cloudData);
            if (!isAdminSession) {
              delete this.memoryData._savedFromAdmin;
            }
            await idbSet('current_portfolio_v3', this.memoryData);
            this.persistToLocal(this.memoryData);
            this.notifyListeners();
          } else if (isLocalNewer && isAdminSession) {
            console.info('[PortfolioDB] Local admin edits are newer than cloud. Preserving and syncing to cloud...');
            await this.saveToCloud(this.memoryData);
          }
        }
      } else {
        // First time initialization: automatically seed empty Firestore with initial dataset!
        console.info('[PortfolioDB] Seeding empty Cloud Firestore with current portfolio dataset...');
        await this.saveToCloud(this.memoryData);
      }
    } catch (cloudErr) {
      console.warn('Cloud fetch notice (falling back to local cache):', cloudErr);
    }
  }

  getImmediateData() {
    return this.memoryData ? JSON.parse(JSON.stringify(this.memoryData)) : null;
  }

  async getData() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
    try {
      // 1. Check IndexedDB for the most complete, updated dataset
      const idbData = await idbGet('current_portfolio_v3');
      if (idbData && idbData.profile && Array.isArray(idbData.projects)) {
        const idbUpdated = idbData._lastUpdated || 0;
        const memUpdated = (this.memoryData && this.memoryData._lastUpdated) || 0;
        if (idbUpdated >= memUpdated) {
          this.memoryData = this._ensureSchemaIntegrity(idbData);
        }
      }
      // 2. Check LocalStorage if newer
      const localStr = localStorage.getItem(DB_KEY);
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (parsed && parsed.profile && Array.isArray(parsed.projects)) {
          const localUpdated = (parsed && parsed._lastUpdated) || 0;
          const memUpdated = (this.memoryData && this.memoryData._lastUpdated) || 0;
          if (localUpdated > memUpdated) {
            this.memoryData = this._ensureSchemaIntegrity(parsed);
          }
        }
      }
    } catch(e) {}
    return JSON.parse(JSON.stringify(this.memoryData));
  }

  saveDraft(draftData) {
    this.memoryData = this._ensureSchemaIntegrity(JSON.parse(JSON.stringify(draftData)));
    this.memoryData._lastUpdated = Date.now();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(this.memoryData));
      }
    } catch (e) {}

    // Broadcast instant real-time sync across open tabs in 0ms!
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DATA_UPDATED', payload: this.memoryData });
      } catch (e) {}
    }
    this.notifyListeners();
  }

  hasDraft() {
    return !!(typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DRAFT_KEY));
  }

  async saveData(newData) {
    this.memoryData = this._ensureSchemaIntegrity(JSON.parse(JSON.stringify(newData)));
    this.memoryData._lastUpdated = Date.now();
    this.memoryData._savedFromAdmin = true;
    
    // 1. Immediately persist to LocalStorage (0ms synchronous)
    this.persistToLocal(this.memoryData);

    // 2. Clear all drafts so obsolete drafts are never remembered
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem('moo_renee_portfolio_draft_v2');
      localStorage.removeItem('moo_renee_portfolio_draft_v3');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem('moo_renee_portfolio_draft_v2');
        sessionStorage.removeItem('moo_renee_portfolio_draft_v3');
      }
    } catch (e) {}

    // 3. Immediately broadcast update to all tabs on same domain (0ms)
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DATA_UPDATED', payload: this.memoryData });
      } catch (e) {}
    }
    this.notifyListeners();

    // 4. Save to IndexedDB (asynchronous)
    await idbSet('current_portfolio_v3', this.memoryData);

    // 5. Auto-save to Google Firebase Cloud Firestore (for live worldwide cross-device visitors)
    let cloudResult = { success: false, reason: 'disabled' };
    if (!this.firestore) this.initCloud();
    if (this.isCloudEnabled && this.firestore) {
      try {
        cloudResult = await this.saveToCloud(this.memoryData);
      } catch(err) {
        cloudResult = { success: false, error: err.message };
      }
    }

    return {
      success: true,
      cloudSynced: !!(cloudResult && cloudResult.success),
      cloudError: cloudResult && cloudResult.error ? cloudResult.error : null
    };
  }

  setupCloudListener() {
    if (!this.firestore) this.initCloud();
    if (!this.firestore || !this.isCloudEnabled || this.cloudUnsubscribe) return;
    try {
      this.cloudUnsubscribe = this.firestore.collection(CLOUD_COLLECTION).doc(CLOUD_DOC)
        .onSnapshot((docSnap) => {
          if (!docSnap || !docSnap.exists) return;
          if (docSnap.metadata && docSnap.metadata.hasPendingWrites) {
            return;
          }
          const cloudPayload = docSnap.data();
          if (cloudPayload && cloudPayload.data && cloudPayload.data.profile) {
            const localUpdated = (this.memoryData && this.memoryData._lastUpdated) || 0;
            const cloudUpdated = (cloudPayload.data && cloudPayload.data._lastUpdated)
              ? Number(cloudPayload.data._lastUpdated)
              : (cloudPayload.clientTimestamp ? new Date(cloudPayload.clientTimestamp).getTime() : 0);

            const isAdminSession = typeof window !== 'undefined' && !!(sessionStorage.getItem('renee_admin_authenticated') || localStorage.getItem('renee_admin_authenticated'));
            const hasLocalEdits = isAdminSession && !!(this.memoryData && this.memoryData._savedFromAdmin);
            const isLocalNewer = hasLocalEdits && (localUpdated > (cloudUpdated + 500));

            // On visitor devices: always apply cloud updates in real-time!
            if (!isLocalNewer || !isAdminSession) {
              console.info('[PortfolioDB] Real-time cloud sync applied.');
              const incoming = this._ensureSchemaIntegrity(cloudPayload.data);
              this.memoryData = this._mergePreservingHighResImages(this.memoryData, incoming);
              if (!isAdminSession) {
                delete this.memoryData._savedFromAdmin;
              }
              idbSet('current_portfolio_v3', this.memoryData);
              this.persistToLocal(this.memoryData);
              this.notifyListeners();
            }
          }
        }, (err) => {
          console.warn('Cloud sync listener error:', err);
        });
    } catch (e) {}
  }

  async _optimizePayloadForCloud(dataToOptimize, targetMaxDim = 1800, targetQuality = 0.85) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return dataToOptimize;
    
    // High-performance concurrent image optimizer
    const shrinkBase64 = (b64, maxDim = targetMaxDim, quality = targetQuality) => {
      return new Promise(resolve => {
        if (!b64 || typeof b64 !== 'string' || !b64.startsWith('data:image')) {
          resolve(b64);
          return;
        }
        if (b64.startsWith('data:image/svg')) {
          resolve(b64);
          return;
        }
        // If already tiny (< 60KB), preserve without alteration
        if (b64.length < 80000) {
          resolve(b64);
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(b64);
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const webpUrl = canvas.toDataURL('image/webp', quality);
            if (webpUrl && webpUrl.startsWith('data:image/webp') && webpUrl.length < b64.length) {
              resolve(webpUrl);
              return;
            }
          } catch(e) {}
          try {
            const jpegUrl = canvas.toDataURL('image/jpeg', quality);
            if (jpegUrl && jpegUrl.length < b64.length) {
              resolve(jpegUrl);
              return;
            }
          } catch(e) {}
          resolve(b64);
        };
        img.src = b64;
      });
    };

    try {
      const tasks = [];

      if (dataToOptimize.profile && dataToOptimize.profile.photoUrl) {
        tasks.push(
          shrinkBase64(dataToOptimize.profile.photoUrl, Math.min(targetMaxDim, 1000), targetQuality)
            .then(res => { dataToOptimize.profile.photoUrl = res; })
        );
      }

      if (Array.isArray(dataToOptimize.projects)) {
        for (const p of dataToOptimize.projects) {
          if (p.coverImage) {
            tasks.push(
              shrinkBase64(p.coverImage, targetMaxDim, targetQuality)
                .then(res => { p.coverImage = res; })
            );
          }
          if (Array.isArray(p.images)) {
            for (let i = 0; i < p.images.length; i++) {
              if (p.images[i] && p.images[i].url) {
                const imgObj = p.images[i];
                tasks.push(
                  shrinkBase64(imgObj.url, targetMaxDim, targetQuality)
                    .then(res => { imgObj.url = res; })
                );
              }
            }
          }
          if (Array.isArray(p.gallery)) {
            for (let i = 0; i < p.gallery.length; i++) {
              if (p.gallery[i] && p.gallery[i].url) {
                const galObj = p.gallery[i];
                tasks.push(
                  shrinkBase64(galObj.url, Math.min(targetMaxDim, 1500), targetQuality)
                    .then(res => { galObj.url = res; })
                );
              }
            }
          }
          if (Array.isArray(p.customSections)) {
            for (let i = 0; i < p.customSections.length; i++) {
              if (p.customSections[i] && p.customSections[i].imageUrl) {
                const csObj = p.customSections[i];
                tasks.push(
                  shrinkBase64(csObj.imageUrl, targetMaxDim, targetQuality)
                    .then(res => { csObj.imageUrl = res; })
                );
              }
            }
          }
        }
      }

      // Execute all image compressions in parallel for lightning-fast save speed
      await Promise.all(tasks);
    } catch (e) {
      console.warn('[PortfolioDB] Payload optimization notice:', e);
    }
    return dataToOptimize;
  }

  async saveToCloud(data) {
    if (!this.firestore) this.initCloud();
    if (!this.firestore || !this.isCloudEnabled) return { success: false, error: 'Firebase Cloud is not connected' };
    try {
      let cleanData = JSON.parse(JSON.stringify(data));

      // Guard Firestore 1 MiB hard document limit:
      // Firestore throws "Document exceeds maximum allowed size of 1,048,576 bytes" if payload is too big.
      // We target <= 720,000 characters to guarantee it ALWAYS fits comfortably.
      const TARGET_SAFE_SIZE = 720000;
      let estSize = JSON.stringify(cleanData).length;

      if (estSize > TARGET_SAFE_SIZE) {
        console.info(`[PortfolioDB] Pre-sync payload is ${Math.round(estSize/1024)}KB. Optimizing images for cloud sync...`);
        // Pass 1: 1800px @ 0.85
        cleanData = await this._optimizePayloadForCloud(cleanData, 1800, 0.85);
        estSize = JSON.stringify(cleanData).length;
        console.info(`[PortfolioDB] Cloud payload pass 1: ${Math.round(estSize/1024)}KB.`);

        // Pass 2: 1400px @ 0.78
        if (estSize > TARGET_SAFE_SIZE) {
          cleanData = await this._optimizePayloadForCloud(cleanData, 1400, 0.78);
          estSize = JSON.stringify(cleanData).length;
          console.info(`[PortfolioDB] Cloud payload pass 2: ${Math.round(estSize/1024)}KB.`);
        }

        // Pass 3: 1100px @ 0.72
        if (estSize > TARGET_SAFE_SIZE) {
          cleanData = await this._optimizePayloadForCloud(cleanData, 1100, 0.72);
          estSize = JSON.stringify(cleanData).length;
          console.info(`[PortfolioDB] Cloud payload pass 3: ${Math.round(estSize/1024)}KB.`);
        }

        // Pass 4: 850px @ 0.65 (guarantees write always succeeds even with dozens of slides)
        if (estSize > TARGET_SAFE_SIZE) {
          cleanData = await this._optimizePayloadForCloud(cleanData, 850, 0.65);
          estSize = JSON.stringify(cleanData).length;
          console.info(`[PortfolioDB] Cloud payload pass 4: ${Math.round(estSize/1024)}KB.`);
        }
      }

      // Strip administrative session flags so visitor devices don't mistakenly assume they are admins
      delete cleanData._savedFromAdmin;

      const clientIso = new Date().toISOString();
      const serverTs = (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : clientIso;

      // Overwrite completely without { merge: true } so old deleted projects and obsolete fields are fully purged
      await this.firestore.collection(CLOUD_COLLECTION).doc(CLOUD_DOC).set({
        data: cleanData,
        updatedAt: serverTs,
        clientTimestamp: clientIso
      });
      console.info('[PortfolioDB] Successfully committed payload to Google Firebase Cloud Firestore!');
      return { success: true };
    } catch (err) {
      console.error('Firebase saveToCloud error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  async connectCloud(configInput) {
    try {
      let cfg = configInput;
      if (typeof cfg === 'string') {
        let cleaned = cfg.trim();
        if (cleaned.includes('=')) {
          cleaned = cleaned.substring(cleaned.indexOf('=') + 1).trim();
          if (cleaned.endsWith(';')) cleaned = cleaned.slice(0, -1).trim();
        }
        try {
          cfg = JSON.parse(cleaned);
        } catch (e1) {
          cfg = new Function(`return (${cleaned});`)();
        }
      }
      if (!cfg || !cfg.apiKey || !cfg.projectId) {
        throw new Error('Invalid Firebase config. apiKey and projectId are required.');
      }

      if (typeof window.firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Check internet connection.');
      }

      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      this.firestore = firebase.firestore();
      this.isCloudEnabled = true;
      this.cloudProjectId = cfg.projectId;
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cfg));

      // Test upload current data to cloud immediately
      const current = await this.getData();
      await this.saveToCloud(current);
      this.setupCloudListener();

      return { success: true, projectId: cfg.projectId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  disconnectCloud() {
    try {
      if (this.cloudUnsubscribe) {
        this.cloudUnsubscribe();
        this.cloudUnsubscribe = null;
      }
      localStorage.removeItem(CLOUD_CONFIG_KEY);
      this.firestore = null;
      this.isCloudEnabled = false;
      this.cloudProjectId = null;
      return true;
    } catch (e) {
      return false;
    }
  }

  getCloudStatus() {
    return {
      enabled: this.isCloudEnabled,
      projectId: this.cloudProjectId || null
    };
  }

  getAdminAuth() {
    if (this.memoryData && this.memoryData.adminAuth && this.memoryData.adminAuth.username) {
      return {
        username: this.memoryData.adminAuth.username,
        password: this.memoryData.adminAuth.password
      };
    }
    try {
      const custom = localStorage.getItem('renee_admin_auth_custom');
      if (custom) {
        const parsed = JSON.parse(custom);
        if (parsed && parsed.username && parsed.password) return parsed;
      }
    } catch(e) {}
    return {
      username: "RENEE@MOO081706",
      password: "36987@RENEE6667"
    };
  }

  async updateAdminAuth(newUsername, newPassword) {
    if (!this.memoryData) await this.getData();
    if (!this.memoryData.adminAuth) {
      this.memoryData.adminAuth = {};
    }
    const cleanUser = (newUsername || '').trim();
    const cleanPass = (newPassword || '').trim();
    if (!cleanUser || !cleanPass) {
      throw new Error('Username and Password cannot be empty.');
    }
    this.memoryData.adminAuth.username = cleanUser;
    this.memoryData.adminAuth.password = cleanPass;
    try {
      localStorage.setItem('renee_admin_auth_custom', JSON.stringify(this.memoryData.adminAuth));
    } catch(e) {}
    await this.saveData(this.memoryData);
    return {
      username: cleanUser,
      password: cleanPass
    };
  }

  async recordVisit(detail = {}) {
    if (!this.firestore || !this.isCloudEnabled) return;
    try {
      const isAuth = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('renee_admin_authenticated') === 'true') ||
                     (typeof localStorage !== 'undefined' && localStorage.getItem('renee_admin_authenticated') === 'true');
      if (isAuth) return;

      // Extract device and platform info
      const ua = navigator.userAgent || '';
      let device = 'Desktop';
      if (/Android/i.test(ua)) device = 'Android';
      else if (/iPhone/i.test(ua)) device = 'iPhone';
      else if (/iPad/i.test(ua)) device = 'iPad';
      else if (/Macintosh/i.test(ua)) device = 'Mac';
      else if (/Windows/i.test(ua)) device = 'Windows PC';

      // Detect Browser
      let browser = 'Browser';
      if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
      else if (/Edg/i.test(ua)) browser = 'Edge';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';

      // Detect Referrer
      let ref = 'Direct Link';
      if (document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname.toLowerCase();
          if (refHost.includes('instagram')) ref = 'Instagram';
          else if (refHost.includes('behance')) ref = 'Behance';
          else if (refHost.includes('linktr.ee')) ref = 'Linktree';
          else if (refHost.includes('google')) ref = 'Google Search';
          else if (refHost.includes('linkedin')) ref = 'LinkedIn';
          else ref = refHost;
        } catch(e) {
          ref = document.referrer;
        }
      }

      let tz = 'Local';
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'KL (UTC+8)';
      } catch(e) {}

      // Personalized username tracking via link (e.g. ?u=sarah or ?ref=alex)
      let customUser = '';
      try {
        const urlParams = new URLSearchParams(window.location.search);
        customUser = urlParams.get('u') || urlParams.get('user') || urlParams.get('ref') || urlParams.get('from') || '';
        if (customUser) {
          sessionStorage.setItem('renee_visitor_username', customUser);
        } else {
          customUser = sessionStorage.getItem('renee_visitor_username') || '';
        }
      } catch(e) {}

      const newEntry = {
        time: new Date().toISOString(),
        formattedTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        username: customUser ? (customUser.startsWith('@') ? customUser : `@${customUser}`) : 'Anonymous Visitor',
        page: detail.page || 'Home Portfolio',
        device: `${device} • ${browser}`,
        timezone: tz,
        referrer: ref
      };

      const statsRef = this.firestore.collection(CLOUD_COLLECTION).doc('site_stats');
      const inc = (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.increment(1)
        : 1;

      // Keep rolling array of last 30 visits
      const snap = await statsRef.get();
      let existingVisits = [];
      if (snap && snap.exists && Array.isArray(snap.data().recentVisits)) {
        existingVisits = snap.data().recentVisits;
      }
      existingVisits.unshift(newEntry);
      if (existingVisits.length > 30) existingVisits = existingVisits.slice(0, 30);

      await statsRef.set({
        totalViews: inc,
        lastVisited: new Date().toISOString(),
        recentVisits: existingVisits
      }, { merge: true });
    } catch(e) {}
  }

  async getVisitStats() {
    if (!this.firestore || !this.isCloudEnabled) return null;
    try {
      const statsRef = this.firestore.collection(CLOUD_COLLECTION).doc('site_stats');
      const doc = await statsRef.get();
      if (doc && doc.exists) {
        return doc.data();
      }
      return { totalViews: 0, lastVisited: null, recentVisits: [] };
    } catch(e) {
      return null;
    }
  }

  /* ================= CONTACT INBOX & EMAIL MESSAGES ================= */
  async saveContactMessage(msgData) {
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: msgData.name || 'Anonymous',
      email: msgData.email || '',
      message: msgData.message || '',
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    // 1. Save locally in localStorage as a backup
    try {
      const localMsgs = JSON.parse(localStorage.getItem('renee_contact_messages') || '[]');
      localMsgs.unshift(msg);
      localStorage.setItem('renee_contact_messages', JSON.stringify(localMsgs.slice(0, 50)));
    } catch(e) {}

    // 2. Save into Firebase Firestore if cloud is active
    if (this.firestore && this.isCloudEnabled) {
      try {
        await this.firestore.collection(CLOUD_COLLECTION).doc('inbox_messages').collection('entries').doc(msg.id).set(msg);
      } catch(err) {
        console.warn('Firestore message save error:', err);
      }
    }
    return msg;
  }

  async getContactMessages() {
    let msgs = [];
    if (this.firestore && this.isCloudEnabled) {
      try {
        const snap = await this.firestore.collection(CLOUD_COLLECTION).doc('inbox_messages').collection('entries').orderBy('timestamp', 'desc').get();
        if (snap && !snap.empty) {
          snap.forEach(doc => msgs.push(doc.data()));
          return msgs;
        }
      } catch(e) {
        console.warn('Firestore get messages error:', e);
      }
    }
    try {
      msgs = JSON.parse(localStorage.getItem('renee_contact_messages') || '[]');
    } catch(e) {}
    return msgs;
  }

  async deleteContactMessage(msgId) {
    try {
      const localMsgs = JSON.parse(localStorage.getItem('renee_contact_messages') || '[]');
      const filtered = localMsgs.filter(m => m.id !== msgId);
      localStorage.setItem('renee_contact_messages', JSON.stringify(filtered));
    } catch(e) {}

    if (this.firestore && this.isCloudEnabled) {
      try {
        await this.firestore.collection(CLOUD_COLLECTION).doc('inbox_messages').collection('entries').doc(msgId).delete();
      } catch(e) {}
    }
    return true;
  }

  async discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem('moo_renee_portfolio_draft_v2');
      localStorage.removeItem('moo_renee_portfolio_draft_v3');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem('moo_renee_portfolio_draft_v2');
        sessionStorage.removeItem('moo_renee_portfolio_draft_v3');
      }
    } catch (e) {}

    // Re-load permanent data
    const idbData = await idbGet('current_portfolio_v3');
    if (idbData && idbData.profile && Array.isArray(idbData.projects)) {
      this.memoryData = this._ensureSchemaIntegrity(idbData);
    } else {
      const local = localStorage.getItem(DB_KEY);
      if (local) {
        try {
          this.memoryData = this._ensureSchemaIntegrity(JSON.parse(local));
        } catch (e) {}
      }
    }

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DATA_UPDATED', payload: this.memoryData });
      } catch (e) {}
    }
    this.notifyListeners();
    return this.memoryData;
  }

  persistToLocal(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage limit reached. Saving streamlined metadata to LocalStorage (full dataset preserved in IndexedDB)...');
      try {
        const slim = JSON.parse(JSON.stringify(data));
        if (Array.isArray(slim.projects)) {
          slim.projects.forEach(p => {
            if (Array.isArray(p.images) && p.images.length > 2) {
              p.images = p.images.slice(0, 2);
            }
            if (Array.isArray(p.gallery) && p.gallery.length > 4) {
              p.gallery = p.gallery.slice(0, 4);
            }
          });
        }
        localStorage.setItem(DB_KEY, JSON.stringify(slim));
      } catch (innerErr) {
        try {
          const mini = {
            _lastUpdated: data._lastUpdated,
            _savedFromAdmin: data._savedFromAdmin,
            profile: data.profile,
            headers: data.headers,
            home: data.home,
            mainCategories: data.mainCategories,
            subLabels: data.subLabels,
            projects: (data.projects || []).map(p => ({
              id: p.id,
              index: p.index,
              title: p.title,
              category: p.category,
              mainSection: p.mainSection,
              discipline: p.discipline,
              subLabels: p.subLabels,
              coverImage: (p.coverImage && p.coverImage.length < 180000) ? p.coverImage : '',
              date: p.date,
              shortDescription: p.shortDescription,
              overview: p.overview
            }))
          };
          localStorage.setItem(DB_KEY, JSON.stringify(mini));
        } catch (finalErr) {
          console.warn('Unable to persist slim data to LocalStorage:', finalErr);
        }
      }
    }
  }

  async resetToDefaults() {
    const currentCodeFingerprint = computeCodeFingerprint(DEFAULT_PORTFOLIO_DATA);
    this.memoryData = this._ensureSchemaIntegrity(JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_DATA)));
    this.memoryData._codeFingerprint = currentCodeFingerprint;
    await idbSet('current_portfolio_v3', this.memoryData);
    this.persistToLocal(this.memoryData);
    try {
      localStorage.removeItem(DRAFT_KEY);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) {}
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DATA_UPDATED', payload: this.memoryData });
      } catch (e) {}
    }
    this.notifyListeners();
    return this.memoryData;
  }

  async resetToCode() {
    return await this.resetToDefaults();
  }

  exportJSON() {
    return JSON.stringify(this.memoryData, null, 2);
  }

  exportDatabaseJs() {
    const rawData = JSON.parse(JSON.stringify(this.memoryData || DEFAULT_PORTFOLIO_DATA));
    const jsonStr = JSON.stringify(rawData, null, 2);
    return [
      '/**',
      ' * MOO RENEE — Database & State Storage Layer (v3)',
      ' * Uses IndexedDB with LocalStorage fallback & cross-tab synchronization.',
      ' * Supports persistent saving, JSON export/import, and automatic default seeding.',
      ' * Contains the complete 17 projects and architectural portfolio dataset.',
      ' * Auto-published from CMS Editor on: ' + new Date().toLocaleString(),
      ' */',
      '',
      "const DB_KEY = 'moo_renee_portfolio_data_v3';",
      "const DRAFT_KEY = 'moo_renee_portfolio_draft_v3';",
      "const DB_NAME = 'MooReneePortfolioDB';",
      "const DB_STORE = 'portfolio_store';",
      "const CLOUD_CONFIG_KEY = 'moo_renee_firebase_config';",
      "const CLOUD_COLLECTION = 'portfolio';",
      "const CLOUD_DOC = 'live_data';",
      '',
      '// Default initial data matching user portfolio',
      'const DEFAULT_PORTFOLIO_DATA = ' + jsonStr + ';',
      '',
      '// Native IndexedDB Helper',
      openIDB.toString(),
      '',
      idbGet.toString(),
      '',
      idbSet.toString(),
      '',
      computeCodeFingerprint.toString(),
      '',
      '/**',
      ' * Database Management Class',
      ' */',
      PortfolioDatabase.toString(),
      '',
      '// Global DB Singleton',
      'window.PortfolioDB = new PortfolioDatabase();',
      ''
    ].join('\n');
  }

  async importJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.profile || !parsed.projects) {
        throw new Error('Invalid portfolio schema. Missing profile or projects.');
      }
      await this.saveData(parsed);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.memoryData);
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    });
  }
}

// Global DB Singleton & Default Schema Export
window.DEFAULT_PORTFOLIO_DATA = DEFAULT_PORTFOLIO_DATA;
window.PortfolioDB = new PortfolioDatabase();
