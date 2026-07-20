# Grocery Intelligence — Live URL Round

This release adds:

- Official circular links on the dashboard, opening in separate tabs.
- Live URL-based scraping attempts for Weis, Harris Teeter and Giant.
- Network JSON, embedded JSON and rendered-page extraction.
- Store/location selection attempts for ZIP 19966.
- Failure screenshots, HTML and response logs in `diagnostics/`.
- Safety protection that preserves the existing published week when the new scrape produces too few deals.

## Install over the existing repository

1. Extract the ZIP.
2. Copy all files into your local `grocery-intelligence` repository.
3. Allow Windows to replace existing files.
4. Do not delete the hidden `.git` folder.
5. In GitHub Desktop, enter `Add live circular URLs and links` in the Summary box.
6. Commit to `main`, then Push origin.

## Test the live updater

After the Pages deployment finishes:

1. Open GitHub → Actions.
2. Select **Update weekly grocery ads**.
3. Select **Run workflow**.
4. Run it from `main`.

The existing screenshot-derived week remains live unless the URL pull passes the minimum-deal safety check. Retailer websites can change or block automated browsers; a failed first run will create downloadable diagnostics rather than erase the working data.
