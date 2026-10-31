# PHASE LOCATION-01: WORK LOCATIONS & GPS PERSISTENCE WALKTHROUGH

## Overview
This walkthrough demonstrates the end-to-end functionality of the Joy PeopleHR Work Locations, GPS Geofencing, and Staff Mapping module following the complete runtime and database persistence closure on canonical Supabase instance `ysiajemrqakfngasehhi`.

---

## 1. HR Head Authentication & Role Context
1. Log in to the Web application as HR Head (`marimuthu@joycorporatesolutions.com`).
2. The user session is authenticated against Supabase GoTrue Auth (`auth.uid() = 4d9bde74-2746-4a8b-96b0-1382de32d3ce`).
3. User profile resolves role `HR_HEAD` and tenant organization `0c621892-e938-4707-9957-13534ea32c19` (Joy Corporate Solutions).
4. Navigating to **Attendance & Time Tracking -> GPS & Mobile Attendance** (`/attendance-employees`) loads cleanly with zero 404/409/ReferenceError exceptions.

---

## 2. Work Location CRUD & Geofence Configuration
1. **Open Geofence Zones Sub-tab:**
   - The UI fetches all active locations from Supabase PostgreSQL table `public.work_locations`.
2. **Add Work Location:**
   - Click **+ Add Work Location**.
   - Input name: `Joy HQ Cyber Park`, coordinates (`11.0844364`, `77.1262627`), address, and geofence radius `120m`.
   - Click **Save**.
   - The system validates coordinates (`isValidGeoPoint()`), resolves the organization ID and branch FK (`fc1782e6-fb46-47e8-a428-9da95e5a4f6f`), and performs an async database upsert.
   - The UI refreshes from Supabase and renders the new location card.
3. **Edit Geofence Radius:**
   - Click **Edit** on a location card.
   - Adjust the radius to `250m` or update the physical address.
   - Click **Save**.
   - PostgreSQL updates the row and UI reflects the modified boundary.
4. **Delete / Deactivate Location:**
   - Click **Remove** or toggle Active status.
   - Database executes DELETE / UPDATE statement and updates the UI.

---

## 3. Google Maps Integration & Geocoding
1. In the Add/Edit location modal, paste a Google Maps link or place URL (e.g. `https://maps.google.com/?q=11.0844364,77.1262627` or place search term).
2. Click **Extract Pin**.
3. `parseGoogleMapsInput()` extracts the latitude, longitude, and place name on the client without firing dead local backend requests (`/api/location/resolve-google-maps`).
4. Reverse geocoding via OpenStreetMap Nominatim automatically populates the street address and city.

---

## 4. Staff Location Mapping
1. Switch to the **Staff Mapping** sub-tab.
2. View staff members and their authorized geofence zones.
3. Click **Configure Mapping** on an employee.
4. Select authorized work locations and designated primary location.
5. Save the mapping. The system updates the employee's primary branch in PostgreSQL and publishes `location.assignment_updated` on the internal event bus.

---

## 5. Verification & Security Summary
- **Zero 404s:** Eliminated obsolete table and endpoint requests.
- **Strict RLS Enforcement:** Organization-level data isolation confirmed across all operations.
- **Production Build:** `npm run build` PASS (0 errors) | `flutter analyze` PASS (0 issues).
