const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'gallery.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const GALLERY_DIR = path.join(PUBLIC_DIR, 'gallery');

function ensureDir(){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

function readManifest(){
  try{
    if (!fs.existsSync(FILE)) return null;
    const raw = fs.readFileSync(FILE, 'utf8');
    const j = JSON.parse(raw);
    if (Array.isArray(j?.files)) return j.files;
    return null;
  }catch{ return null; }
}

function writeManifest(files){
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify({ files }, null, 2), 'utf8');
}

// Configure multer storage for admin uploads
ensureDir();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, GALLERY_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
    const ts = Date.now();
    cb(null, `${base}_${ts}${ext}`);
  }
});

const upload = multer({ storage });

// Public: list gallery items (used by customer-facing Gallery page)
router.get('/', (req,res)=>{
  const files = readManifest();
  if (files){
    // Ensure each file has a URL pointing under /gallery
    const withUrls = files.map(f => ({
      ...f,
      url: f.url || `/gallery/${f.name}`
    }));
    return res.json({ files: withUrls });
  }
  const defaults = ['Sameer1.jpg','Sameer2.jpg','Sameer3.jpg','Sameer4.jpg','Sameer5.jpg','Sameer6.jpg','Sameer7.jpg','Sameer8.jpg'];
  return res.json({ files: defaults.map(x=> ({ name:x, title:x, url:`/gallery/${x}` })) });
});

// Admin: read current list
router.get('/admin', auth(['admin']), (req,res)=>{
  const files = readManifest() || [];
  const withUrls = files.map(f => ({
    ...f,
    url: f.url || `/gallery/${f.name}`
  }));
  res.json({ files: withUrls });
});

// Admin: upload a new image
router.post('/admin/upload', auth(['admin']), upload.single('image'), (req,res)=>{
  try{
    if (!req.file) return res.status(400).json({ error:'Image file is required' });
    const title = (req.body.title || req.file.originalname).toString().trim();
    const name = req.file.filename;
    const url = `/gallery/${name}`;
    const files = readManifest() || [];
    const entry = { name, title, url, created_at: new Date().toISOString() };
    files.push(entry);
    writeManifest(files);
    res.json({ ok:true, file: entry });
  }catch(e){
    console.error('Gallery upload error:', e);
    res.status(500).json({ error:'Failed to upload image' });
  }
});

// Admin: delete an image by filename
router.delete('/admin/:name', auth(['admin']), (req,res)=>{
  try{
    const name = req.params.name;
    const files = readManifest() || [];
    const remaining = files.filter(f => f.name !== name);
    if (remaining.length === files.length) return res.status(404).json({ error:'Not found' });

    // Remove file from disk (best-effort)
    const filePath = path.join(GALLERY_DIR, name);
    try{
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }catch(e){ console.warn('Failed to delete gallery file from disk:', e.message); }

    writeManifest(remaining);
    res.json({ ok:true });
  }catch(e){
    res.status(500).json({ error:'Failed to delete image' });
  }
});

// Admin: update list (reorder/edit/remove) via manifest
router.put('/admin', auth(['admin']), (req,res)=>{
  try{
    const files = Array.isArray(req.body?.files) ? req.body.files : null;
    if (!files) return res.status(400).json({ error:'files array required' });
    const norm = files.map(x=>({
      name: String(x.name||'').trim(),
      title: String(x.title||'').trim() || String(x.name||'').trim(),
      description: String(x.description||'').trim(),
      url: x.url ? String(x.url).trim() : undefined
    }));
    writeManifest(norm);
    res.json({ ok:true, files: norm });
  }catch(e){ res.status(500).json({ error:'Failed to save gallery', details: e.message }); }
});

module.exports = router;
