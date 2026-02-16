import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import config from './config.js';
import fs from 'fs-extra';

const claudeApi = express.Router();

// Load system prompts at startup
const generatePrompt = fs.readFileSync('server/claude-system-prompt.txt', 'utf8');
const formatPrompt = fs.readFileSync('server/claude-format-prompt.txt', 'utf8');
const statblockPrompt = fs.readFileSync('server/claude-statblock-prompt.txt', 'utf8');

claudeApi.post('/api/claude', async (req, res) => {
	const apiKey = config.get('anthropic_api_key');
	if(!apiKey) {
		return res.status(500).json({
			error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable or add to config.'
		});
	}

	const { prompt, brewText, mode = 'generate', formData } = req.body;

	// Validate based on mode
	if(mode === 'generate' && (!prompt || !prompt.trim())) {
		return res.status(400).json({ error: 'Prompt is required' });
	}
	if(mode === 'format' && (!brewText || !brewText.trim())) {
		return res.status(400).json({ error: 'Document text is required for formatting' });
	}
	if(mode === 'statblock' && (!formData || !formData.name)) {
		return res.status(400).json({ error: 'Creature name is required' });
	}

	const client = new Anthropic({ apiKey });

	// Select system prompt and build message based on mode
	let systemPrompt, userMessage;
	if(mode === 'statblock') {
		systemPrompt = statblockPrompt;
		userMessage = JSON.stringify(formData);
	} else if(mode === 'format') {
		systemPrompt = formatPrompt;
		userMessage = prompt?.trim()
			? `${brewText}\n\n---\n\nAdditional instructions: ${prompt}`
			: brewText;
	} else {
		systemPrompt = generatePrompt;
		userMessage = brewText
			? `Current document:\n\n${brewText}\n\n---\n\nUser request: ${prompt}`
			: prompt;
	}

	try {
		const message = await client.messages.create({
			model      : 'claude-sonnet-4-20250514',
			max_tokens : 8192,
			system     : systemPrompt,
			messages   : [{
				role    : 'user',
				content : userMessage
			}]
		});

		res.json({ response: message.content[0].text });
	} catch (error) {
		console.error('Claude API error:', error);
		res.status(500).json({
			error: error.message || 'Failed to get response from Claude'
		});
	}
});

export default claudeApi;
