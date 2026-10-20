# MOO RENEE — Interactive Spatial Design Portfolio 2026

A modern, high-contrast Swiss / Neo-Brutalist portfolio website and Content Management System designed for **Moo Renee**, student of **Bachelor of Interactive Spatial Design (Hons)** at **Taylor's University, Kuala Lumpur**.

---

## 🌟 Key Architecture & Features

This system consists of two primary web interfaces connected by a live browser database:

### 1. Public Viewer Website (`index.html`)
- **Persistent Header & Footer**:
  - Top Header: Navigation (`HOME`, `ABOUT`, `PROJECTS`, `CONTACT`) + direct link to `ADMIN`. Always present at the top of all pages.
  - Bottom Footer: `MOO RENEE • PORTFOLIO 2026` / `TAYLOR'S UNIVERSITY • KUALA LUMPUR`. Always docked at the bottom of all pages.
- **Home Screen (100vh Viewport Fit — No Scroll)**:
  - Fits 100% of the screen height nicely without body scrolling on desktop.
  - Exact brutalist split layout: massive white `PORT` on black, massive black `FOLIO` on off-white.
  - **Interactive 12-Column Grid Hover**: Hovering over the architectural grid columns highlights that box and displays different disciplinary summaries in the bottom card in real-time.
- **Selected Projects Archive (`#projects`)**:
  - Top black banner with `01. SELECTED PROJECT`.
  - **Live Search & Filter**: Search by keyword or click label buttons (`ALL`, `FIGMA`, `BLENDER`, `UNITY`, `AE`). Clicking an active button or `ALL` clears the filter.
  - **Card Hover Inversion**: Project cards invert color on hover (white background turns solid black, text turns bone-white, buttons invert).
  - **Text Truncation**: Overly long descriptions automatically truncate with `...`.
- **Project Detail View (`#project/:id`)**:
  - Matches the exact layout from your design mockups (`media_1791639579059.png`):
    - Top header: `PROJECT NAME`, `DATE`, and `LABEL` tags.
    - Description with dotted underline accents.
    - 3 `RELATED LINK` black blocks (clickable links).
    - **Main Image Stream**:
      - Configurable gap setting: **No Gap** (images touch seamlessly side-by-side) or **With Gap**.
      - **Auto-scroll**: Continuously and smoothly scrolls the image stream horizontally with pause-on-hover.
      - Unlimited images with captions.
    - **Video Section**: Embeds YouTube, Vimeo, or direct MP4 videos.
    - **Supplementary Gallery**: Grid for additional portfolio exhibits.
    - `← BACK TO ALL PROJECTS` quick navigation.
- **About Me View (`#about`)**:
  - Exact match of your About Me mockup:
    - Top banner with `ABOUT MOO RENEE` and your bio paragraph.
    - 3-column top section: Profile portrait, direct contact details (`+60 18-3687393`, `moorenee481@gmail.com`, Behance, Linktree), Education timeline with CGPA (3.67, 3.79), Software badges, and Languages table.
    - Middle mega banner: `SKILLS, EXPERIENCE & ACHIEVEMENTS`.
    - 4-column bottom matrix: Technical Skills, Personal Skills + Internship Experience at **Virtualtech Frontier (VTF)**, Achievements list, and Competitions record.
- **Contact Me View (`#contact`)**:
  - 1-click email copy button with instant toast.
  - Brutalist inquiry transmission form.

---

### 2. Admin Content Management System (`admin.html`)
A dedicated control panel to edit everything on the portfolio directly in your web browser:
- **Profile & Identity**: Edit name, degree, institution, status, bio, phone, email, social links, and upload your profile photo (with live preview).
- **Home Hover Disciplines**: Add, edit, or delete the discipline hover cards that appear on the Home screen.
- **Projects Manager**:
  - Create new projects or edit existing ones.
  - Set Title, Date, Labels, Short Description, Full Description.
  - Set Image Stream layout: **NO GAP** or **YES GAP**.
  - Toggle Auto-scroll on/off.
  - Add unlimited images (upload local images directly from your computer or paste URLs) and set custom captions.
  - Add video embed URL (YouTube/Vimeo/MP4).
  - Add/remove Related Links.
  - Add/remove Supplementary Gallery images.
- **About Me (Full CV)**:
  - Add, edit, or remove Education entries.
  - Add, edit, or remove Software badges & 2-letter codes.
  - Add, edit, or remove Languages & proficiencies.
  - Add, edit, or remove Technical Skills and Personal Skills.
  - Add, edit, or remove Experience cards.
  - Add, edit, or remove Achievements and Competitions.
- **Database Backup & Synchronization**:
  - **Download Backup (.JSON)**: Exports your entire database (including uploaded images) to a portable backup file.
  - **Restore from Backup**: Upload any backup file to restore your portfolio instantly.
  - **Reset to Defaults**: Reverts back to the clean official design preset.
  - **Real-Time Cross-Tab Sync**: When you click "SAVE ALL CHANGES" in Admin, your open Portfolio tab updates automatically!

---

## 🚀 How to Run & Use

No build steps or server installation required! The database runs directly in your browser using IndexedDB and LocalStorage.

1. **Open the Portfolio (Viewer)**:
   - Double-click **`index.html`** in Windows File Explorer (or right-click -> **Open with Google Chrome / Microsoft Edge**).
2. **Open the Admin CMS**:
   - Double-click **`admin.html`**, or click the **`⚙ ADMIN`** button in the top navigation bar of `index.html`.
3. **Make Edits**:
   - Change your bio, add a project, or upload images in `admin.html`.
   - Click **`SAVE ALL CHANGES`**.
   - Switch to or refresh `index.html` to see your updates live!

---

## 📂 File Structure

```
Renee Portfolio/
├── index.html        # Public Portfolio Website (Home, About, Projects, Project Detail, Contact)
├── admin.html        # Admin CMS Dashboard & Database Editor
├── database.js       # Database storage layer (IndexedDB/LocalStorage + default seeds)
├── script.js         # Viewer application controller (routing, search, filters, auto-scroll)
├── admin.js          # Admin controller (CRUD forms, file-to-base64, backup/restore)
├── styles.css        # Main Swiss/Brutalist stylesheet
├── admin.css         # Admin CMS stylesheet
└── README.md         # Documentation
```
