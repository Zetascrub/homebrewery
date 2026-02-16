import './statGenModal.less';
import React, { useState, useRef, useEffect } from 'react';
import request from '../../utils/request-middleware.js';

const CR_OPTIONS = [
	'0', '1/8', '1/4', '1/2',
	'1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
	'11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
	'21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
];

const SIZE_OPTIONS = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

const TYPE_OPTIONS = [
	'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon',
	'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid',
	'Monstrosity', 'Ooze', 'Plant', 'Undead'
];

const ALIGNMENT_OPTIONS = [
	'lawful good', 'neutral good', 'chaotic good',
	'lawful neutral', 'true neutral', 'chaotic neutral',
	'lawful evil', 'neutral evil', 'chaotic evil',
	'unaligned', 'any alignment'
];

const IMAGE_STYLE_OPTIONS = [
	{ key: 'noText',        label: 'No text or labels',  keyword: 'no text, no labels, no writing, no letters' },
	{ key: 'portraitStyle', label: 'Portrait / bust',     keyword: 'portrait style, head and shoulders, bust composition' },
	{ key: 'fullBody',      label: 'Full body',           keyword: 'full body illustration, showing entire creature' },
	{ key: 'actionPose',    label: 'Action pose',         keyword: 'dynamic action pose, mid-attack, dramatic movement' },
	{ key: 'inkStyle',      label: 'Ink / pen style',     keyword: 'black and white ink illustration, pen and ink drawing style, crosshatching' },
	{ key: 'painterly',     label: 'Painterly / oil',     keyword: 'oil painting style, painterly, rich textures, fine art' },
];

function buildImagePrompt(name, size, type, abilities, imageOpts) {
	let prompt = `D&D fantasy monster illustration, detailed concept art: A ${size} ${type} called "${name}".`;

	if(abilities.trim()) {
		prompt += ` Key features: ${abilities.trim()}.`;
	}

	prompt += ' Dark fantasy art style, dramatic lighting.';

	const activeKeywords = IMAGE_STYLE_OPTIONS
		.filter((opt)=>imageOpts[opt.key])
		.map((opt)=>opt.keyword);

	if(activeKeywords.length > 0) {
		prompt += ` ${activeKeywords.join(', ')}.`;
	}

	return prompt;
}

export default function StatGenModal({ onClose, onInsert }){
	const [name, setName] = useState('');
	const [cr, setCr] = useState('1');
	const [size, setSize] = useState('Medium');
	const [type, setType] = useState('Beast');
	const [alignment, setAlignment] = useState('unaligned');
	const [abilities, setAbilities] = useState('');
	const [frameStyle, setFrameStyle] = useState('standard');
	const [includeDescription, setIncludeDescription] = useState(false);
	const [generateImage, setGenerateImage] = useState(false);
	const [imageOpts, setImageOpts] = useState({ noText: true });
	const [imageQuality, setImageQuality] = useState('medium');
	const [transparentBg, setTransparentBg] = useState(false);

	const [preview, setPreview] = useState('');
	const [description, setDescription] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isGeneratingImage, setIsGeneratingImage] = useState(false);
	const [error, setError] = useState(null);
	const [copied, setCopied] = useState(false);

	// Regenerate image prompt editing
	const [showRegenPrompt, setShowRegenPrompt] = useState(false);
	const [regenPrompt, setRegenPrompt] = useState('');

	const dialogRef = useRef(null);

	useEffect(()=>{
		dialogRef.current?.showModal();
	}, []);

	const handleClose = ()=>{
		dialogRef.current?.close();
		onClose();
	};

	const handleKeyDown = (e)=>{
		if(e.key === 'Escape') {
			if(showRegenPrompt) {
				setShowRegenPrompt(false);
			} else {
				handleClose();
			}
		}
	};

	const toggleImageOpt = (key)=>{
		setImageOpts((prev)=>({ ...prev, [key]: !prev[key] }));
	};

	const doImageGeneration = async (prompt, opts = {})=>{
		setIsGeneratingImage(true);
		setError(null);
		try {
			const imgRes = await request
				.post('/api/openai/generate-image')
				.send({
					prompt,
					quality    : opts.quality || imageQuality,
					background : opts.transparent ?? transparentBg ? 'transparent' : 'opaque'
				});
			setImageUrl(imgRes.body.url);
		} catch (imgErr) {
			console.error('Image generation failed:', imgErr);
			setError(imgErr.response?.body?.error || 'Image generation failed');
		} finally {
			setIsGeneratingImage(false);
		}
	};

	const handleGenerate = async ()=>{
		if(!name.trim()) {
			setError('Creature name is required');
			return;
		}
		if(isLoading) return;

		setIsLoading(true);
		setError(null);
		setPreview('');
		setDescription('');
		setImageUrl('');
		setShowRegenPrompt(false);

		try {
			const res = await request
				.post('/api/claude')
				.send({
					mode     : 'statblock',
					formData : {
						name       : name.trim(),
						cr,
						size,
						type,
						alignment,
						abilities  : abilities.trim(),
						frameStyle
					}
				});

			const statBlock = res.body.response;
			setPreview(statBlock);

			// Generate description if checked
			if(includeDescription) {
				try {
					const descRes = await request
						.post('/api/claude')
						.send({
							mode   : 'generate',
							prompt : `Write a short 2-3 sentence flavour description for this D&D monster. Output ONLY the description text, no formatting, no headers, no quotes. Make it evocative and suitable for a Monster Manual entry.\n\nStat block:\n${statBlock}`
						});
					setDescription(descRes.body.response);
				} catch (descErr) {
					console.error('Description generation failed:', descErr);
				}
			}

			// Generate image if checked
			if(generateImage) {
				const prompt = buildImagePrompt(name.trim(), size, type, abilities, imageOpts);
				await doImageGeneration(prompt);
			}
		} catch (err) {
			setError(err.response?.body?.error || err.message || 'Failed to generate stat block');
		} finally {
			setIsLoading(false);
		}
	};

	const handleRegenerate = ()=>{
		const prompt = buildImagePrompt(name.trim(), size, type, abilities, imageOpts);
		setRegenPrompt(prompt);
		setShowRegenPrompt(true);
	};

	const handleRegenSubmit = async ()=>{
		setShowRegenPrompt(false);
		await doImageGeneration(regenPrompt);
	};

	const buildInsertText = ()=>{
		let text = '';

		if(description) {
			text += `*${description}*\n\n`;
		}

		if(imageUrl) {
			text += `![${name.trim()}](${imageUrl}){width:300px,mix-blend-mode:multiply}\n\n`;
		}

		text += preview;
		return text;
	};

	const handleInsert = ()=>{
		if(onInsert && preview) {
			onInsert(buildInsertText());
			handleClose();
		}
	};

	const handleCopy = ()=>{
		const text = buildInsertText();
		if(text) {
			navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(()=>setCopied(false), 2000);
		}
	};

	return (
		<dialog ref={dialogRef} className='statGenModal' onKeyDown={handleKeyDown}>
			<div className='sgModalInner'>

				<div className='sgHeader'>
					<h2><i className='fas fa-hat-wizard' /> AI Stat Block Generator</h2>
					<button className='sgCloseBtn' onClick={handleClose} title='Close'>
						<i className='fas fa-times' />
					</button>
				</div>

				<div className='sgBody'>
					<div className='sgForm'>
						<div className='sgFormGroup'>
							<label>Creature Name <span className='sgRequired'>*</span></label>
							<input
								type='text'
								value={name}
								onChange={(e)=>setName(e.target.value)}
								placeholder='e.g. Shadow Drake'
								autoFocus
							/>
						</div>

						<div className='sgFormRow'>
							<div className='sgFormGroup'>
								<label>Challenge Rating</label>
								<select value={cr} onChange={(e)=>setCr(e.target.value)}>
									{CR_OPTIONS.map((c)=>(
										<option key={c} value={c}>{c}</option>
									))}
								</select>
							</div>
							<div className='sgFormGroup'>
								<label>Size</label>
								<select value={size} onChange={(e)=>setSize(e.target.value)}>
									{SIZE_OPTIONS.map((s)=>(
										<option key={s} value={s}>{s}</option>
									))}
								</select>
							</div>
						</div>

						<div className='sgFormRow'>
							<div className='sgFormGroup'>
								<label>Type</label>
								<select value={type} onChange={(e)=>setType(e.target.value)}>
									{TYPE_OPTIONS.map((t)=>(
										<option key={t} value={t}>{t}</option>
									))}
								</select>
							</div>
							<div className='sgFormGroup'>
								<label>Alignment</label>
								<select value={alignment} onChange={(e)=>setAlignment(e.target.value)}>
									{ALIGNMENT_OPTIONS.map((a)=>(
										<option key={a} value={a}>{a}</option>
									))}
								</select>
							</div>
						</div>

						<div className='sgFormGroup'>
							<label>Key Abilities / Theme</label>
							<textarea
								value={abilities}
								onChange={(e)=>setAbilities(e.target.value)}
								placeholder='e.g. fire breath, flying, immune to fire, pack tactics'
								rows={3}
							/>
						</div>

						<div className='sgFormGroup'>
							<label>Frame Style</label>
							<div className='sgRadioGroup'>
								<label className='sgRadio'>
									<input
										type='radio'
										name='frameStyle'
										value='standard'
										checked={frameStyle === 'standard'}
										onChange={()=>setFrameStyle('standard')}
									/>
									Standard
								</label>
								<label className='sgRadio'>
									<input
										type='radio'
										name='frameStyle'
										value='wide'
										checked={frameStyle === 'wide'}
										onChange={()=>setFrameStyle('wide')}
									/>
									Wide
								</label>
							</div>
						</div>

						<div className='sgDivider' />

						<label className='sgCheckbox'>
							<input
								type='checkbox'
								checked={includeDescription}
								onChange={(e)=>setIncludeDescription(e.target.checked)}
							/>
							<span>Include monster description</span>
						</label>

						<label className='sgCheckbox'>
							<input
								type='checkbox'
								checked={generateImage}
								onChange={(e)=>setGenerateImage(e.target.checked)}
							/>
							<span>Generate image (DALL-E)</span>
						</label>

						{generateImage && (
							<div className='sgImageOptions'>
								<div className='sgImageOptRow'>
									<label className='sgSmallLabel'>Quality</label>
									<select className='sgSmallSelect' value={imageQuality} onChange={(e)=>setImageQuality(e.target.value)}>
										<option value='low'>Low (fast)</option>
										<option value='medium'>Medium</option>
										<option value='high'>High (slow)</option>
									</select>
								</div>
								<label className='sgCheckboxSmall'>
									<input
										type='checkbox'
										checked={transparentBg}
										onChange={(e)=>setTransparentBg(e.target.checked)}
									/>
									<span>Transparent background</span>
								</label>
								<div className='sgImageOptDivider' />
								{IMAGE_STYLE_OPTIONS.map((opt)=>(
									<label className='sgCheckboxSmall' key={opt.key}>
										<input
											type='checkbox'
											checked={!!imageOpts[opt.key]}
											onChange={()=>toggleImageOpt(opt.key)}
										/>
										<span>{opt.label}</span>
									</label>
								))}
							</div>
						)}

						<button
							className='sgGenerateBtn'
							onClick={handleGenerate}
							disabled={isLoading || !name.trim()}
						>
							{isLoading
								? <><i className='fas fa-spinner fa-spin' /> Generating...</>
								: <><i className='fas fa-wand-magic-sparkles' /> Generate Stat Block</>
							}
						</button>
					</div>

					<div className='sgPreview'>
						{!preview && !isLoading && !error && (
							<div className='sgPlaceholder'>
								<i className='fas fa-dragon' />
								<span>Fill in the form and click Generate</span>
							</div>
						)}

						{isLoading && !preview && (
							<div className='sgPlaceholder'>
								<i className='fas fa-spinner fa-spin' />
								<span>Generating stat block...</span>
							</div>
						)}

						{error && (
							<div className='sgError'>
								<i className='fas fa-exclamation-circle' /> {error}
							</div>
						)}

						{preview && <>
							<div className='sgPreviewHeader'>
								<h3>{name}</h3>
								<div className='sgPreviewBtns'>
									<button className='sgCopyBtn' onClick={handleCopy}>
										<i className={copied ? 'fas fa-check' : 'fas fa-copy'} />
										{copied ? 'Copied' : 'Copy'}
									</button>
									{onInsert && (
										<button className='sgInsertBtn' onClick={handleInsert} disabled={isGeneratingImage}>
											<i className='fas fa-file-import' /> Insert
										</button>
									)}
								</div>
							</div>
							<div className='sgPreviewContent'>
								{description && (
									<div className='sgDescriptionPreview'>
										<div className='sgDescriptionLabel'><i className='fas fa-scroll' /> Description</div>
										<p>{description}</p>
									</div>
								)}
								{isGeneratingImage && (
									<div className='sgImageLoading'>
										<i className='fas fa-spinner fa-spin' /> Generating image...
									</div>
								)}
								{imageUrl && !isGeneratingImage && (
									<div className='sgImagePreview'>
										<div className='sgImagePreviewTop'>
											<div className='sgImageLabel'><i className='fas fa-image' /> Generated Image</div>
											<button className='sgRegenBtn' onClick={handleRegenerate} title='Regenerate with edited prompt'>
												<i className='fas fa-redo' /> Regenerate
											</button>
										</div>
										<img src={imageUrl} alt={name} />
									</div>
								)}
								<pre className='sgPreviewCode'>{preview}</pre>
							</div>
						</>}

						{showRegenPrompt && (
							<div className='sgRegenOverlay'>
								<div className='sgRegenPanel'>
									<div className='sgRegenHeader'>
										<h4><i className='fas fa-image' /> Edit Image Prompt</h4>
										<button className='sgCloseBtn' onClick={()=>setShowRegenPrompt(false)}>
											<i className='fas fa-times' />
										</button>
									</div>
									<textarea
										className='sgRegenTextarea'
										value={regenPrompt}
										onChange={(e)=>setRegenPrompt(e.target.value)}
										rows={6}
									/>
									<div className='sgRegenActions'>
										<button className='sgRegenCancel' onClick={()=>setShowRegenPrompt(false)}>
											Cancel
										</button>
										<button className='sgRegenSubmit' onClick={handleRegenSubmit}>
											<i className='fas fa-image' /> Regenerate Image
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className='sgFooter'>
					<span className='sgCredit'>
						Powered by Claude AI {generateImage ? '& DALL-E' : ''}
					</span>
					<button className='sgFooterClose' onClick={handleClose}>Close</button>
				</div>

			</div>
		</dialog>
	);
}
