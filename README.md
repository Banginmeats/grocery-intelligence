# Grocery Intelligence - PDF Circular Studio V1

This release replaces live retailer scraping with user-supplied PDF circulars.

## Capabilities

- Upload any number of PDF circulars.
- Rename each PDF to any store name.
- Process image-only and text-based PDFs locally in the browser using PDF.js and Tesseract OCR.
- Review, edit, add, exclude or delete extracted offers.
- Publish the reviewed week into browser storage.
- Compare arbitrary stores rather than a fixed three-store list.
- Download the completed week as JSON for backup.
- Preserve the built-in demonstration week.

## Important limitations

OCR is not perfect, especially on dense, colorful grocery pages. The review screen is therefore part of the intended workflow, not an optional warning.

The published uploaded week is stored in the current browser's local storage. It appears on the dashboard on that browser/device. The downloaded JSON is the portable backup. A later server-backed release can publish uploaded weeks for every visitor.

## Install in the existing GitHub repository

1. Extract the ZIP.
2. Copy all files into:
   `C:\Users\Owner\Documents\GitHub\grocery-intelligence`
3. Keep the hidden `.git` folder.
4. In GitHub Desktop, commit with:
   `Install PDF circular studio`
5. Push origin.
6. Wait for GitHub Pages to deploy.
7. Open the dashboard and click **Upload circular PDFs**.

Internet access is required while processing because PDF.js and Tesseract.js are loaded from public CDNs.


## Version 2.2 changes
- Publishes routine missing-size, selected-variety, online-only and discount-only offers automatically with clear notices.
- Reduces the true internal review queue from 408 to only genuinely unclear source items.
- Includes Giant deals in comparison eligibility instead of excluding them merely because of routine review flags.
- Replaces Public-ready with Giant deal coverage.
- Separates Exact Product, Same Brand and Similar Category comparisons.
- Shows all valid deals in All Deals.
