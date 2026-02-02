import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import asyncHandler from 'express-async-handler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_IMAGES_DIR = path.join(__dirname, '..', 'staticImages');

// Ensure staticImages directory exists
fs.ensureDirSync(STATIC_IMAGES_DIR);

const router = express.Router();

// Import images from external URLs (like imgchest)
router.post('/api/images/import', asyncHandler(async (req, res)=>{
	const { urls } = req.body;

	if(!urls || !Array.isArray(urls) || urls.length === 0) {
		return res.status(400).json({ error: 'No URLs provided' });
	}

	// Limit to 200 images per request to prevent abuse
	if(urls.length > 200) {
		return res.status(400).json({ error: 'Too many URLs (max 200)' });
	}

	const results = [];
	const urlMapping = {};

	for (const url of urls) {
		try {
			// Extract filename from URL
			const urlObj = new URL(url);
			const filename = path.basename(urlObj.pathname);

			// Only allow image extensions
			const ext = path.extname(filename).toLowerCase();
			if(!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
				results.push({ url, success: false, error: 'Invalid file type' });
				continue;
			}

			const localPath = path.join(STATIC_IMAGES_DIR, filename);
			const localUrl = `/staticImages/${filename}`;

			// Check if file already exists
			if(await fs.pathExists(localPath)) {
				urlMapping[url] = localUrl;
				results.push({ url, success: true, localUrl, skipped: true });
				continue;
			}

			// Download the image
			const response = await fetch(url);
			if(!response.ok) {
				results.push({ url, success: false, error: `HTTP ${response.status}` });
				continue;
			}

			const buffer = Buffer.from(await response.arrayBuffer());

			// Validate it's actually an image (check magic bytes)
			if(!isValidImage(buffer)) {
				results.push({ url, success: false, error: 'Invalid image data' });
				continue;
			}

			await fs.writeFile(localPath, buffer);
			urlMapping[url] = localUrl;
			results.push({ url, success: true, localUrl });

		} catch (err) {
			results.push({ url, success: false, error: err.message });
		}
	}

	const successful = results.filter((r)=>r.success).length;
	const failed = results.filter((r)=>!r.success).length;

	res.json({
		message    : `Imported ${successful} images, ${failed} failed`,
		urlMapping,
		results
	});
}));

// Upload image directly
router.post('/api/images/upload', asyncHandler(async (req, res)=>{
	const { filename, data } = req.body;

	if(!filename || !data) {
		return res.status(400).json({ error: 'Missing filename or data' });
	}

	// Validate filename
	const ext = path.extname(filename).toLowerCase();
	if(!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
		return res.status(400).json({ error: 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp, svg' });
	}

	// Sanitize filename - remove path separators and special chars
	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

	// Generate unique filename if exists
	let finalFilename = sanitizedFilename;
	let localPath = path.join(STATIC_IMAGES_DIR, finalFilename);
	let counter = 1;
	while(await fs.pathExists(localPath)) {
		const name = path.basename(sanitizedFilename, ext);
		finalFilename = `${name}_${counter}${ext}`;
		localPath = path.join(STATIC_IMAGES_DIR, finalFilename);
		counter++;
	}

	try {
		// Decode base64 data
		const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
		const buffer = Buffer.from(base64Data, 'base64');

		// Validate it's actually an image
		if(!isValidImage(buffer)) {
			return res.status(400).json({ error: 'Invalid image data' });
		}

		// Limit file size to 10MB
		if(buffer.length > 10 * 1024 * 1024) {
			return res.status(400).json({ error: 'File too large (max 10MB)' });
		}

		await fs.writeFile(localPath, buffer);

		res.json({
			success  : true,
			filename : finalFilename,
			url      : `/staticImages/${finalFilename}`,
			size     : buffer.length
		});
	} catch (err) {
		res.status(500).json({ error: `Upload failed: ${err.message}` });
	}
}));

// List uploaded images
router.get('/api/images/list', asyncHandler(async (req, res)=>{
	try {
		const files = await fs.readdir(STATIC_IMAGES_DIR);
		const images = files.filter((f)=>{
			const ext = path.extname(f).toLowerCase();
			return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);
		});

		const imageList = await Promise.all(images.map(async (filename)=>{
			const stat = await fs.stat(path.join(STATIC_IMAGES_DIR, filename));
			return {
				filename,
				url  : `/staticImages/${filename}`,
				size : stat.size,
				date : stat.mtime
			};
		}));

		// Sort by date, newest first
		imageList.sort((a, b)=>new Date(b.date) - new Date(a.date));

		res.json({ images: imageList });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}));

// Helper to validate image magic bytes
function isValidImage(buffer) {
	if(buffer.length < 8) return false;

	// PNG
	if(buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
	// JPEG
	if(buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
	// GIF
	if(buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
	// WebP
	if(buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
	   buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
	// SVG (text-based, check for XML/SVG markers)
	const str = buffer.toString('utf8', 0, Math.min(buffer.length, 500));
	if(str.includes('<svg') || str.includes('<?xml')) return true;

	return false;
}

export default router;
