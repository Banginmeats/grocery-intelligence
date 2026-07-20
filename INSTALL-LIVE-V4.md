# Install and Run Live Grocery Intelligence V4

## Replace your repository files

1. Extract this ZIP.
2. Copy everything inside it into:
   `C:\Users\Owner\Documents\GitHub\grocery-intelligence`
3. Approve replacing files.
4. Keep the hidden `.git` folder.
5. In GitHub Desktop, use Summary:
   `Install live grocery updater V4`
6. Click **Commit to main**, then **Push origin**.

## Run the live pull

After the push:

1. Open the repository on GitHub.
2. Click **Actions**.
3. In the left column, click **Live grocery URL update**.
4. Click **Run workflow** on the right.
5. Choose `main`.
6. Click the green **Run workflow** button.

## What to expect

The currently published 251-deal week is explicitly labeled as a screenshot fallback. It is not represented as live URL data.

The workflow will:
- visit all three official retailer pages;
- capture JSON responses, embedded data and visible offer cards;
- normalize and deduplicate offers;
- refuse to replace the current week if the live pull is suspiciously small;
- upload diagnostic files even when the run fails.

Retailer sites can block automated browsers or change their internal data. The first Actions run is the required live test. Its diagnostic artifact provides the evidence needed for retailer-specific adjustments.
