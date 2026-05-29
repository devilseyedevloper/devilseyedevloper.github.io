# Portfolio — Gursimran Singh

Local portfolio website with a Node.js backend that stores contact submissions and ratings in both text logs and JSON database files.

Run locally:

```bash
npm install
npm start
# then open http://localhost:3000
```

Admin login:

- Open `http://localhost:3000/login.html`
- Username: `devilseye`
- Password: `guri5779`

Deploy with Docker:

```bash
docker build -t gursimran-portfolio .
docker run -p 3000:3000 gursimran-portfolio
```

Deploy to a cloud host:

1. Push this repository to GitHub.
2. Connect the repo to a Node.js host such as Railway, Render, or Fly.
3. Use the default start command:

```bash
npm install
npm start
```

The host will provide a public URL that anyone can open.

Files of interest:
- `server.js` — Express backend that saves contacts and ratings to `contacts.txt`, `ratings.txt`, `contacts.json`, and `ratings.json`.
- `public/index.html` — Homepage with rating widget and logo home link.
- `public/projects.html` — Projects page with screenshot frames ready for demo images.
- `public/features.html` — Features page with expanded service details.
- `public/contact.html` — Client contact form.
- `public/admin.html` — Admin login and dashboard for reviewing/deleting contact records.

Notes:
- Contact submissions are stored in `contacts.json` and appended to `contacts.txt` as a backup log.
- Ratings are saved in `ratings.json` and logged in `ratings.txt` as statements such as "User has given me 5 star rating".
- The admin dashboard allows deleting individual contact entries from the stored database.
