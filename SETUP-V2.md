# Grocery Intelligence V2 — Replace Existing Repository Files

This package replaces the earlier scaffold.

## Important deployment design

GitHub Pages should remain configured as:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

There is intentionally **no `pages.yml` workflow** in this version. GitHub's built-in Pages deployment publishes the static dashboard.

## Replace the files using GitHub Desktop

1. Extract this ZIP.
2. Open your local repository:
   `C:\Users\Owner\Documents\GitHub\grocery-intelligence`
3. Keep the hidden `.git` folder.
4. Copy everything from this extracted package into the repository and approve replacing existing files.
5. Delete `.github\workflows\pages.yml` if it somehow still exists.
6. In GitHub Desktop, commit with:
   `Install Grocery Intelligence V2`
7. Push origin.

## Expected workflow folder

`.github/workflows/` should contain only:

- `update-weekly.yml`

## First checks

After pushing:

1. The built-in `pages build and deployment` run should publish the site.
2. Open **Actions → Update weekly grocery ads**.
3. Click **Run workflow → Run workflow** to test the updater manually.
4. If a retailer blocks extraction or changes its page, the workflow will fail safely and upload a `grocery-scraper-diagnostics` artifact. It will not overwrite the last good week with an empty dataset.

## Current status

The dashboard and update pipeline are implemented. Retailer sites are dynamic and may require selector maintenance after the first live GitHub Actions run. The failure diagnostics are designed to show the page HTML and screenshots needed for that adjustment.
