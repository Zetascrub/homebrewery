import './claudeModal.less';
import React, { useState, useRef, useEffect } from 'react';
import request from '../../utils/request-middleware.js';

export default function ClaudeModal({ brew, onInsert, onReplace, onClose }){
	const [mode, setMode] = useState('generate');
	const [prompt, setPrompt] = useState('');
	const [response, setResponse] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [copied, setCopied] = useState(false);

	const dialogRef = useRef(null);
	const textareaRef = useRef(null);

	useEffect(()=>{
		dialogRef.current?.showModal();
		textareaRef.current?.focus();
	}, []);

	// Clear response when switching modes
	useEffect(()=>{
		setResponse('');
		setError(null);
	}, [mode]);

	const handleSubmit = async (e)=>{
		e.preventDefault();
		if(mode === 'generate' && !prompt.trim()) return;
		if(mode === 'format' && !brew?.text?.trim()) return;
		if(isLoading) return;

		setIsLoading(true);
		setError(null);
		setResponse('');

		try {
			const res = await request
				.post('/api/claude')
				.send({
					prompt   : prompt.trim(),
					brewText : brew?.text || '',
					mode
				});

			setResponse(res.body.response);
		} catch (err) {
			setError(err.response?.body?.error || err.message || 'Failed to get response');
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopy = ()=>{
		navigator.clipboard.writeText(response);
		setCopied(true);
		setTimeout(()=>setCopied(false), 2000);
	};

	const handleInsert = ()=>{
		if(onInsert && response) {
			onInsert(response);
			onClose();
		}
	};

	const handleReplace = ()=>{
		if(onReplace && response) {
			onReplace(response);
			onClose();
		}
	};

	const handleClose = ()=>{
		dialogRef.current?.close();
		onClose();
	};

	const handleKeyDown = (e)=>{
		if(e.key === 'Escape') {
			handleClose();
		}
		// Ctrl/Cmd + Enter to submit
		if((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			handleSubmit(e);
		}
	};

	const canSubmit = mode === 'generate'
		? prompt.trim() && !isLoading
		: brew?.text?.trim() && !isLoading;

	return (
		<dialog ref={dialogRef} className='claudeModal' onKeyDown={handleKeyDown}>
			<div className='modalHeader'>
				<h2><i className='fas fa-robot' /> AI Assist</h2>
				<button className='closeButton' onClick={handleClose} title='Close'>
					<i className='fas fa-times' />
				</button>
			</div>

			<div className='modeTabs'>
				<button
					className={`modeTab ${mode === 'generate' ? 'active' : ''}`}
					onClick={()=>setMode('generate')}
					type='button'
				>
					<i className='fas fa-wand-magic-sparkles' /> Generate
				</button>
				<button
					className={`modeTab ${mode === 'format' ? 'active' : ''}`}
					onClick={()=>setMode('format')}
					type='button'
				>
					<i className='fas fa-align-left' /> Format
				</button>
			</div>

			<form onSubmit={handleSubmit} className='promptForm'>
				{mode === 'generate' ? (
					<textarea
						ref={textareaRef}
						value={prompt}
						onChange={(e)=>setPrompt(e.target.value)}
						placeholder='Ask Claude to help with your homebrew...&#10;&#10;Examples:&#10;- Create a CR 5 undead monster&#10;- Review this stat block for balance&#10;- Write a 3rd level evocation spell&#10;- Format this as a class feature table'
						rows={5}
						disabled={isLoading}
					/>
				) : (
					<>
						<div className='formatInfo'>
							<i className='fas fa-info-circle' />
							<span>Will clean up and reformat your entire document using proper Homebrewery markdown syntax.</span>
						</div>
						<textarea
							ref={textareaRef}
							value={prompt}
							onChange={(e)=>setPrompt(e.target.value)}
							placeholder='Optional: Add specific instructions...&#10;&#10;Examples:&#10;- Focus on the monster stat blocks&#10;- Convert the spell list to proper format&#10;- Fix the table formatting'
							rows={3}
							disabled={isLoading}
						/>
					</>
				)}
				<div className='formActions'>
					<button
						type='submit'
						className='submitButton'
						disabled={!canSubmit}
					>
						{isLoading ? (
							<><i className='fas fa-spinner fa-spin' /> {mode === 'format' ? 'Formatting...' : 'Thinking...'}</>
						) : mode === 'format' ? (
							<><i className='fas fa-magic' /> Format Document</>
						) : (
							<><i className='fas fa-paper-plane' /> Send</>
						)}
					</button>
					<span className='hint'>Ctrl+Enter to send</span>
				</div>
			</form>

			{error && (
				<div className='errorMessage'>
					<i className='fas fa-exclamation-circle' /> {error}
				</div>
			)}

			{response && (
				<div className='responseSection'>
					<div className='responseHeader'>
						<h3>{mode === 'format' ? 'Formatted Document' : 'Response'}</h3>
						<div className='responseActions'>
							<button onClick={handleCopy} className='actionButton' title='Copy to clipboard'>
								<i className={copied ? 'fas fa-check' : 'fas fa-copy'} />
								{copied ? ' Copied!' : ' Copy'}
							</button>
							{mode === 'format' ? (
								<button onClick={handleReplace} className='actionButton primary' title='Replace document'>
									<i className='fas fa-sync-alt' /> Replace Document
								</button>
							) : (
								<button onClick={handleInsert} className='actionButton primary' title='Insert at cursor'>
									<i className='fas fa-file-import' /> Insert
								</button>
							)}
						</div>
					</div>
					<pre className='responseContent'>{response}</pre>
				</div>
			)}
		</dialog>
	);
}
