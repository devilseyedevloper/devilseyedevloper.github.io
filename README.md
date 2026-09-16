# Portfolio — Gursimran Singh

Portfolio website with a static frontend and a contact form that can submit via Formspree or email.

Open the site as static files by opening `public/index.html` in your browser, or host it on any static host such as GitHub Pages, Netlify, or Vercel.

Contact:
- Open `public/contact.html` and submit through Formspree or email.
- Replace `YOUR_FORM_ID` in the form `action` with your real Formspree form ID.

Optional local server:

```bash
npm install
npm start
```

## Admin controls

The private admin page is available at `/admin.html`. Configure these server environment variables before starting the app:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key must remain server-side and must never be placed in `public/`. The admin can remove Supabase reviews and contact messages, maintain blocked visitor records, and hide project screenshots from the public site. The current project has no client account system, so there are no user accounts to remove yet; blocked visitors are stored as moderation records instead.

The public `auth.html` page uses Supabase Auth email/password accounts. Enable Email provider authentication in Supabase before using signup. Users can browse as guests. A checked "Remember me" session is invalidated after three days without activity; an unchecked session lasts for the current browser session. Passwords are never stored by this website.

Files of interest:
- `public/index.html` — Main homepage with hero, quick stats, featured work overview, and conversion CTAs.
- `public/about.html` — Dedicated About Me page with bio, development philosophy, and career timeline.
- `public/skills.html` — Dedicated Technical Skills page with categorized technologies and proficiency indicators.
- `public/projects.html` — Dedicated Projects showcase with live search, filters, and case studies.
- `public/features.html` — Dedicated Services & Capabilities page with delivery workflows.
- `public/pricing.html` — Dedicated Pricing page with interactive scope calculator and currency switcher.
- `public/reviews.html` — Dedicated Client Reviews and live Supabase feedback submission hub.
- `public/contact.html` — Contact page with Formspree inquiry form and WhatsApp integration.
- `public/auth.html` — Client portal authentication (login / signup).
- `public/account.html` — Client workspace and order status dashboard.

Notes:
- The site no longer relies on local admin or rating pages.
- Contact submissions are now handled externally via Formspree.
