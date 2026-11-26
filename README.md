# Inntinn Journeys — site and CMS

A static site with a Git-based CMS. There is no build step: Netlify serves
this folder as it stands, and the page fetches its content from `/content`
at runtime. When an editor publishes, Decap commits JSON to the repo,
Netlify redeploys, and the change is live.

---

## 1. Folder map

```
.
├── index.html              the whole site: markup, styles, behaviour
├── js/
│   └── content-loader.js   fetches /content and fills the page
├── content/                everything the CMS writes
│   ├── countries/          one file per destination (20)
│   ├── guides/             one file per guide (20)
│   ├── properties/         one file per property (2)
│   └── pages/              contact, desk clocks, legal
├── admin/
│   ├── index.html          the editor
│   └── config.yml          the content model
├── assets/
│   ├── brand/              logo files and app icons — do not let editors touch
│   ├── social/             the link-preview image
│   └── uploads/            where the CMS puts editor uploads
├── netlify.toml            headers, caching, redirects
├── _redirects              duplicate of the redirect rules
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── favicon.ico
└── apple-touch-icon.png
```

### The index files — important

`content/_index/countries.json`, `guides.json` and `properties.json` list the
entries in each folder. The browser has no way to list a directory, so the
loader reads these.

They sit **outside** the collection folders deliberately. Decap treats every
`.json` inside a folder collection as an entry, so an index file kept in
`content/countries/` appears in the editor as a broken record and can stop
the collection listing altogether.

**Decap does not maintain them.** After an editor adds or deletes an entry
you must update the matching `_index.json`. Three ways to handle it:

1. Run `node tools/reindex.js` locally and commit (included below).
2. Add a Netlify build command that runs it on every deploy — the cleanest
   fix, and the one I would use. See section 7.
3. Edit the file by hand for the first few entries.

---

## 2. First deploy

1. Create a Git repository and push this folder to it, branch `main`.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command: leave empty. Publish directory: `.`
4. Deploy. The site will be live on a `*.netlify.app` address.

Check `https://<your-site>.netlify.app/` loads and the map shows twenty
markers. If the map is empty, open the console: the loader logs which
content file failed.

---

## 3. CMS authentication

The editor uses Netlify Identity with Git Gateway. Both are free.

1. Netlify dashboard → **Project configuration → Identity → Enable Identity**.
2. Under **Registration**, set **Invite only**. Do not leave it open — anyone
   who registers could edit the site.
3. Under **Services → Git Gateway**, click **Enable Git Gateway**. This is
   what lets the editor commit without each person having a GitHub account.
4. Under **Identity → Invite users**, invite yourself. Accept the emailed
   link, set a password, and you will land at `/admin/`.
5. Optional: under **Registration → External providers**, add Google so the
   team signs in with their work accounts instead of passwords.

**If the invitation link opens the home page and nothing happens**, the
identity widget on `index.html` is missing or blocked — it is included in
this build, so check it was not stripped.

**The editor will not run in a preview pane or from a local file.** It needs
the deployed site: the bundle is served from `/admin/vendor/`, and Netlify
Identity and Git Gateway only exist on a Netlify domain. Test at
`https://<your-site>.netlify.app/admin/`, never by opening the HTML directly.

**The editor bundle is vendored.** `/admin/vendor/` holds Decap 3.17.3,
about 6 MB across 98 files, committed to the repo. There is no CDN in the
path, so a public CDN being slow, blocked or down cannot take the editor
offline. To upgrade: `npm pack decap-cms@<version>`, unpack, and copy
`dist/decap-cms.js`, its numbered chunk files and the two `.wasm` files over
`/admin/vendor`. Do not copy the `.map` files — they are 56 MB and do
nothing in production.

**If `/admin/` shows a blank screen**, the Decap script did not load. This
build pins `decap-cms@3.17.3`, which is a real release. If you bump the
version, check it exists at
`https://github.com/decaporg/decap-cms/releases` first — a version that does
not exist returns a 404 from the CDN and the page stays empty with no error.
The page now reports this itself rather than failing silently.

**"Your Git Gateway backend is not returning valid settings"** means Identity
is working but Git Gateway is not switched on, or it lost its link to the
repository. In the Netlify dashboard:

1. **Project configuration → Identity**. Confirm Identity is enabled.
2. Scroll to **Services → Git Gateway**. If it says *Enable Git Gateway*,
   click it and authorise the repository when prompted.
3. If it is already enabled, click **Edit settings → Disable Git Gateway**,
   then enable it again. The token it stores expires, and re-enabling is the
   documented fix.
4. Hard-refresh `/admin/` and log in again.

It also appears when the repository was transferred, renamed, or the
authorising GitHub account lost access — re-enabling re-issues the token
against the current repository.

**If saving fails with a 401 or 403**, Git Gateway is enabled but the branch
in `admin/config.yml` (`main`) does not match your repository's default
branch.

---

## 4. Domain

1. Netlify → **Domain management → Add a domain** → `inntinnjourneys.com`.
2. Either delegate the domain to Netlify DNS (simplest; change the
   nameservers at your registrar), or keep your DNS where it is and add:
   - `A` record on the apex → Netlify's load balancer IP, shown in the panel
   - `CNAME` on `www` → `<your-site>.netlify.app`
3. Set the primary domain and tick **Force HTTPS**. The certificate is issued
   automatically once DNS resolves; allow up to an hour.
4. Then update these four places, which carry the domain in plain text:
   - `admin/config.yml` — `site_url` and `display_url`
   - `robots.txt` — the sitemap line
   - `sitemap.xml` — the `<loc>`
   - `index.html` — the canonical link and the `og:` / `twitter:` tags

---

## 5. Editing

`https://inntinnjourneys.com/admin/`

Four sections: **Destinations — countries**, **— guides**, **— properties**,
and **Site**.

Editorial workflow is on, so entries move Draft → In review → Ready before
they publish. A draft becomes a pull request; publishing merges it.

Rules worth telling your editors once:

- **Never change a country's `key` after publishing.** Guides and properties
  point at it, and changing it orphans them.
- **Captions are prose, not file names.** Every gallery image shows its
  caption under the picture.
- **The counts are deliberate.** Where a field says three to five, the design
  assumes it.
- **Resize before uploading.** The limit is 6 MB, but 2500px wide at about
  400 KB is the right target. Nothing here needs more.

---

## 6. Adding a destination

1. **Destinations — countries → New.** Fill `key`, name, region, latitude and
   longitude, hero image, and the four text fields. Publish.
2. Update `content/_index/countries.json` (see section 1).
3. The map marker, the list view and the mega menu pick it up on next load.

A property needs its `countryKey` to match an existing country's `key`.

---

## 7. Making the index files automatic

Add `tools/reindex.js` (included) and set the Netlify build command to:

```
node tools/reindex.js
```

Publish directory stays `.`. The script rewrites the three `_index.json`
files from whatever is in the folders, so editors never think about it.

---

## 8. Checking the CMS is actually wired to the site

Three checks, in order. Each one isolates a different link in the chain.

**1. Is the content in the repository, at the top level?**
On GitHub, you should see `content/countries/` with 20 files at the *root* of
the repo — not inside a `site/` folder. If your repo root contains a `site/`
folder, Decap will find nothing: `folder: content/countries` in config.yml is
always read relative to the repository root, even when Netlify's base
directory points somewhere else. Either move everything up a level, or
prefix every `folder:` in config.yml with `site/`.

**2. Is the content being served?**
Open `https://<your-site>/content/_index/countries.json`. You should get a
list of 20 names. If this 404s but the editor works, the site is deploying
from a different directory than the one Decap is writing to.

**3. Does an edit reach the site?**
In the editor, open any country, change the one-line positioning, and
publish. Within a minute or two Netlify will show a new deploy triggered by
a commit from Git Gateway. Reload the site, open that destination, and the
new line should be there. If the commit appears in GitHub but the site does
not change, the deploy is still running or the content cache headers were
removed from `netlify.toml`.

## 9. Known limitations, stated plainly

- **One URL.** Every destination and property is a view inside `index.html`,
  so none of them can be linked to, bookmarked or ranked separately. For a
  travel site this is the real cost of the current architecture. Moving to
  Astro fixes it and is the next significant piece of work.
- **The sitemap has one entry** for the same reason.
- **Property photographs on The Lodge at Wah are hot-linked** from the
  property's own Squarespace CDN. Get written permission and move them into
  `assets/uploads` before launch.
- **Contact details are placeholders** in `content/pages/contact.json`.
- **The Mara property is a sample.** Clear its `flag` field or delete it.
