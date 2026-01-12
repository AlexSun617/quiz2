# IP Networking Certification Prep (Static Site)

This is a **static** flashcard-style quiz website you can host on **GitHub Pages**.

## Features
- Topic hub (practice section-by-section)
- Final Test (all questions from all topics, randomized)
- Flashcard flip: select answers → Submit → flips to show **your selection** vs **correct answer(s)**
- Live stats: answered / correct / incorrect / remaining

## How to publish on GitHub Pages
1. Create a new GitHub repo (public is easiest).
2. Upload **all files** from this folder to the repo root (index.html must be at the root).
3. In GitHub: **Settings → Pages**
4. Source: **Deploy from a branch**
5. Branch: `main` and folder: `/ (root)`
6. Save. Your site URL will appear on that page.

## Updating questions
The quiz data lives in `questions.js` (auto-generated from your section text files).
