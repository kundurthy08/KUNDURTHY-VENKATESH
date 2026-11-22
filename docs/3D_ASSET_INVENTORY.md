# Charminar Café — 3D & Brand Asset Inventory

**Audit Date:** 22 November 2026  
**Audited Scope:** Complete workspace (`/`, `/src`, `/public`)

---

## 1. Discovery Summary

Upon inspecting the full project repository prior to application development:

- **Supplied Reference Document:** `public/assets/aistudio/Charminar_Cafe_Website_Development_Blueprint_b1623257.html` (27 KB, HTML product & architecture blueprint).
- **Supplied External 3D Models (`.glb`, `.gltf`, `.fbx`, `.obj`, `.blend`):** **None found in repository.**
- **Supplied HDRI / Textures / Audio / Brand Logo SVG:** **None found in repository.**

Because no external `.glb`/`.gltf` model files or official brand logo SVGs were supplied in the workspace, the application implements:
1. A **60fps Cinematic Architectural Film Hero** (`src/components/cinema/CinematicCafeHero.tsx`) featuring a dark-to-gold Charminar SVG intro curtain, smooth Ken Burns camera motion across four 16:9 photorealistic Hyderabad heritage interior scenes, interactive depth parallax, and volumetric golden dust motes.
2. A **high-resolution architectural & culinary concept image set** stored locally under `src/assets/images/`, clearly designated as concept visuals until owner photography or `.glb` models are uploaded.
3. A **ready-to-use `public/models/` GLTF/GLB intake pipeline** documented below so supplied Blender/GLB assets can be swapped in cleanly.

---

## 2. Active Scene & Visual Asset Register

| Asset / Module | Format | Approx. Size | Source / Licence | Purpose | Texture Dependencies | Animation Availability | Compatibility | Optimisation Notes | Proposed Location |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CinematicCafeHero.tsx` (60fps Canvas Cinema Compositor) | TypeScript / React / HTML5 2D Canvas | ~11 KB code | Project-owned | Unobstructed 16:9 Royal Nizam Architectural Film Viewport (with silk alpha cross-dissolves, smooth Ken Burns camera moves, golden sunbeam motes, progress bar, and dedicated editorial CTA bar cleanly below) | Four 16:9 Royal Nizam stills (`src/assets/images/`) | Golden Charminar SVG line-draw intro, logo emergence, continuous eased camera motion & crossfades | All browsers (`prefers-reduced-motion` compliant) | Hardware-accelerated 2x DPR canvas compositing; zero floating box obstructing the interior architecture | Home Hero (`src/components/cinema/CinematicCafeHero.tsx`) |
| `nizam_palace_hall_1795363759621.jpg` | JPEG (16:9) | Local bundle | Generated Royal Nizam Interior Still | Chapter 01: Towering heritage green & gold-leaf cusped arches, crystal chandeliers, carved jaali sunbeams | None | Continuous Canvas Camera Zoom/Pan | All browsers | Widescreen 16:9 | Cinema Hero & Our Story (`src/assets/images/`) |
| `nizam_samovar_counter_1795363760681.jpg` | JPEG (16:9) | Local bundle | Generated Royal Nizam Interior Still | Chapter 02: Steaming brass samovar, gold-rimmed porcelain & bevelled vitrine under terracotta Nizami arches | None | Continuous Canvas Camera Pan | All browsers | Widescreen 16:9 | Cinema Hero & Our Story (`src/assets/images/`) |
| `nizam_divan_alcove_1795363759678.jpg` | JPEG (16:9) | Local bundle | Generated Royal Nizam Interior Still | Chapter 03: Emerald velvet divan alcoves, gilded archways & antique teak jaali screens | None | Continuous Canvas Camera Push-In | All browsers | Widescreen 16:9 | Cinema Hero & Our Story (`src/assets/images/`) |
| `cafe_3d_courtyard_arch_1795361406785.jpg` | JPEG (16:9) | Local bundle | Generated Architectural Still | Chapter 04: Sunlit Verandah Colonnade & Courtyard Light | None | Continuous Canvas Camera Drift | All browsers | Widescreen 16:9 | Cinema Hero (`src/assets/images/`) |
| `cafe_cinema_archway_1795363259752.jpg` | JPEG (16:9) | Local bundle | Generated Concept Asset | Earlier archway entrance study (archived in asset folder) | None | Static | All browsers | Widescreen 16:9 | `src/assets/images/` |
| `cafe_cinema_samovar_1795363258980.jpg` | JPEG (16:9) | Local bundle | Generated Concept Asset | Earlier counter study (archived in asset folder) | None | Static | All browsers | Widescreen 16:9 | `src/assets/images/` |
| `menu_irani_chai_1795358468520.jpg` | JPEG | Local bundle | Generated Concept Asset (Draft Menu Preview) | Signature Irani Chai & Osmania Biscuits card | None | Static | All browsers | `aspect-[4/3]` `object-cover` | Signature Menu & Menu Catalog |
| `menu_bun_maska_1795358468592.jpg` | JPEG | Local bundle | Generated Concept Asset (Draft Menu Preview) | Signature Bun Maska card | None | Static | All browsers | `aspect-[4/3]` `object-cover` | Signature Menu & Menu Catalog |
| `menu_hyderabadi_snack_1795358468472.jpg` | JPEG | Local bundle | Generated Concept Asset (Draft Menu Preview) | Savory Snacks & Sandwiches card | None | Static | All browsers | `aspect-[4/3]` `object-cover` | Menu Catalog |
| `menu_deccan_coffee_1795358468183.jpg` | JPEG | Local bundle | Generated Concept Asset (Draft Menu Preview) | Deccan Filter Coffee & Espresso card | None | Static | All browsers | `aspect-[4/3]` `object-cover` | Menu Catalog |
| `menu_saffron_dessert_1795358468508.jpg` | JPEG | Local bundle | Generated Concept Asset (Draft Menu Preview) | Double Ka Meetha Dessert card | None | Static | All browsers | `aspect-[4/3]` `object-cover` | Menu Catalog |
| `BrandCrest` (Wordmark Emblem) | Inline SVG | < 2 KB | Custom heritage arch vector placeholder | Header/Footer brand mark until official owner logo SVG is supplied | None | Static | All browsers | Crisp vector scaling | `src/components/layout/Navbar.tsx` & `Footer.tsx` |


---

## 3. Pending Owner / Developer Asset Intake Checklist

When the café owner supplies downloaded 3D files and official brand photography, place optimised web-ready exports in `public/models/` and `public/images/` and check each criterion before replacing the procedural/concept assets:

- [ ] **Format & Delivery:** Export models as binary `.glb` (Draco or Meshopt compressed; target `< 3 MB` initial hero payload).
- [ ] **Orientation & Pivot:** `+Y` up, `+Z` forward, bottom-center pivot grounded at `y = 0` (`1 unit = 1 meter`).
- [ ] **Textures:** Resize diffuse/normal/roughness maps to `<= 1024px` (or `2048px` max for hero walls) in WebP/KTX2; verify `SRGBColorSpace` on albedo maps.
- [ ] **Materials:** PBR `MeshStandardMaterial` / `MeshPhysicalMaterial`; confirm no missing texture URIs.
- [ ] **Animation Clips:** Verify clip names, loop duration, and frame budget on mid-range mobile devices.
- [ ] **Commercial Licence:** Attach vendor URL, invoice/licence receipt, and attribution rules (if required) to this document.
- [ ] **Official Brand Assets:** Replace `BrandCrest` placeholder with the unmodified owner-supplied SVG logo, and replace concept menu/interior images with verified café photography via the Admin Portal.
