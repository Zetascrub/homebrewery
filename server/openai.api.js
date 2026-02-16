import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_IMAGES_DIR = path.join(__dirname, '..', 'staticImages');
fs.ensureDirSync(STATIC_IMAGES_DIR);

const openaiApi = express.Router();

openaiApi.post('/api/openai/generate-image', async (req, res) => {
	const apiKey = config.get('openai_api_key');
	if(!apiKey) {
		return res.status(503).json({
			error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable or add to config.'
		});
	}

	const { prompt, quality = 'medium', background = 'opaque' } = req.body;
	if(!prompt || !prompt.trim()) {
		return res.status(400).json({ error: 'Image prompt is required' });
	}

	// Use png for transparent backgrounds, webp otherwise
	const outputFormat = background === 'transparent' ? 'png' : 'webp';

	try {
		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method  : 'POST',
			headers : {
				'Content-Type'  : 'application/json',
				'Authorization' : `Bearer ${apiKey}`
			},
			body : JSON.stringify({
				model      : 'gpt-image-1',
				prompt     : prompt.trim(),
				n          : 1,
				size       : '1024x1024',
				quality    : quality,
				background : background
			})
		});

		if(!response.ok) {
			const errorData = await response.json().catch(()=>({}));
			throw new Error(errorData.error?.message || `OpenAI API returned ${response.status}`);
		}

		const data = await response.json();
		const b64 = data.data?.[0]?.b64_json;

		if(!b64) {
			throw new Error('No image data returned from OpenAI');
		}

		// Save to staticImages with a unique filename
		const hash = crypto.randomBytes(8).toString('hex');
		const filename = `ai-${hash}.${outputFormat}`;
		const filepath = path.join(STATIC_IMAGES_DIR, filename);

		const imageBuffer = Buffer.from(b64, 'base64');
		await fs.writeFile(filepath, imageBuffer);

		res.json({ url: `/staticImages/${filename}` });
	} catch (error) {
		console.error('OpenAI image generation error:', error);
		res.status(500).json({
			error: error.message || 'Failed to generate image'
		});
	}
});

export default openaiApi;
