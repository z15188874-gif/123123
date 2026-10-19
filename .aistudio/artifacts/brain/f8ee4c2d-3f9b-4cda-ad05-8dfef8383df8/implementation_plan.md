# Implementation Plan - Update Platform Logo, Login Background, and Platform Name

## User Requests Summary

1. Set the uploaded image (`/assets/aistudio/1792226093974_15388eac.jpg`) as the platform logo.
2. Replace the blue background on the login page with this image (used as a styled background with a dark navy overlay for readability).
3. Change the platform name from "منصة الإبحار" to "منصة الأستاذ سعيد مطر".
4. Do not touch or modify the database or any unrelated files.

---

## Planned Changes

### 1. Platform Name Update

Change "منصة الإبحار" (and related Al-Ibhhar brand names) to "منصة الأستاذ سعيد مطر" in:

- `src/routes/__root.tsx` (Root metadata, title, og tags)
- `src/routes/index.tsx` (Login page title, meta description, WhatsApp share link, heading)
- `src/components/AppShell.tsx` (Brand component)
- Admin and student route files where platform name appears in headers/titles.

### 2. Platform Logo Update

- In `src/components/AppShell.tsx` (`Brand` component) and `src/routes/index.tsx`, replace the `Anchor` icon with an `<img>` tag pointing to `/assets/aistudio/1792226093974_15388eac.jpg`.

### 3. Login Page Background

- In `src/routes/index.tsx`, update the hero section (currently `bg-gradient-navy`) to use the uploaded image as a background (`style={{ backgroundImage: 'url(/assets/aistudio/1792226093974_15388eac.jpg)' }}` with background cover and a dark navy gradient overlay `bg-navy/90`).

---

## Verification Plan

- Verify compilation with `compile_applet`.
- Run linter with `lint_applet`.
