const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { DEFAULT_GALLERY_FILES } = require('../utils/galleryDefaults');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'gallery.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const GALLERY_DIR = path.join(PUBLIC_DIR, 'gallery');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

function readManifest() {
  try {
    if (!fs.existsSync(FILE)) return null;
    const raw = fs.readFileSync(FILE, 'utf8');
    const j = JSON.parse(raw);
    if (Array.isArray(j?.files)) return j.files;
    return null;
  } catch {
    return null;
  }
}

function writeManifest(files) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify({ files }, null, 2), 'utf8');
}

function withUrls(files) {
  return files.map((f) => ({
    ...f,
    url: f.url || (f.source === 'assets' ? `/assets/${f.name}` : `/gallery/${f.name}`),
  }));
}

function mergeDefaultAssets(existing) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const names = new Set(list.map((f) => f.name));
  for (const asset of DEFAULT_GALLERY_FILES) {
    if (!names.has(asset.name)) list.push({ ...asset });
  }
  return list;
}

ensureDir();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GALLERY_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

router.get('/', (_req, res) => {
  const files = readManifest();
  const list = files && files.length ? files : DEFAULT_GALLERY_FILES;
  res.json({ files: withUrls(list) });
});

router.get('/admin', auth(['admin']), (_req, res) => {
  const files = readManifest() || [];
  const list = files.length ? files : DEFAULT_GALLERY_FILES;
  res.json({ files: withUrls(list) });
});

router.post('/admin/seed-assets', auth(['admin']), (_req, res) => {
  try {
    const merged = mergeDefaultAssets(readManifest() || []);
    writeManifest(merged);
    res.json({ ok: true, files: withUrls(merged) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to seed gallery assets' });
  }
});

router.post('/admin/upload', auth(['admin']), upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });
    const title = (req.body.title || req.file.originalname).toString().trim();
    const name = req.file.filename;
    const entry = {
      name,
      title,
      url: `/gallery/${name}`,
      source: 'upload',
      created_at: new Date().toISOString(),
    };
    const files = readManifest() || mergeDefaultAssets([]);
    files.push(entry);
    writeManifest(files);
    res.json({ ok: true, file: entry });
  } catch (e) {
    console.error('Gallery upload error:', e);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.patch('/admin/:name', auth(['admin']), (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const files = readManifest() || [];
    const idx = files.findIndex((f) => f.name === name);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    if (title) files[idx].title = title;
    if (description !== undefined) files[idx].description = description;
    writeManifest(files);
    res.json({ ok: true, file: withUrls([files[idx]])[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update image' });
  }
});

router.delete('/admin/:name', auth(['admin']), (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const files = readManifest() || [];
    const target = files.find((f) => f.name === name);
    if (!target) return res.status(404).json({ error: 'Not found' });

    const remaining = files.filter((f) => f.name !== name);
    if (target.source !== 'assets') {
      const filePath = path.join(GALLERY_DIR, name);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Failed to delete gallery file from disk:', e.message);
      }
    }
    writeManifest(remaining);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.put('/admin', auth(['admin']), (req, res) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : null;
    if (!files) return res.status(400).json({ error: 'files array required' });
    const norm = files.map((x) => ({
      name: String(x.name || '').trim(),
      title: String(x.title || '').trim() || String(x.name || '').trim(),
      description: String(x.description || '').trim(),
      url: x.url ? String(x.url).trim() : undefined,
      source: x.source || 'upload',
    }));
    writeManifest(norm);
    res.json({ ok: true, files: withUrls(norm) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save gallery' });
  }
});

module.exports = router;
