import './coverImageModal.less';
import React, { useState, useRef, useEffect } from 'react';
import { captureFirstPage, downloadCoverImage, sanitizeFilename, DTRPG_WIDTH, DTRPG_HEIGHT } from '../../../../shared/coverImageHelper.js';

export default function CoverImageModal({ brewTitle, onClose }){
	const [format, setFormat] = useState('jpeg');
	const [quality, setQuality] = useState(85);
	const [preview, setPreview] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState(null);

	const dialogRef = useRef(null);

	useEffect(()=>{
		dialogRef.current?.showModal();
		generatePreview();
	}, []);

	useEffect(()=>{
		// Regenerate preview when format or quality changes (debounced)
		const timeout = setTimeout(()=>{
			generatePreview();
		}, 300);
		return ()=>clearTimeout(timeout);
	}, [format, quality]);

	const generatePreview = async ()=>{
		setIsGenerating(true);
		setError(null);
		try {
			const result = await captureFirstPage({
				format,
				quality : quality / 100
			});
			setPreview(result);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleDownload = async ()=>{
		setIsDownloading(true);
		setError(null);
		try {
			await downloadCoverImage({
				format,
				quality  : quality / 100,
				filename : brewTitle || 'cover'
			});
			handleClose();
		} catch (err) {
			setError(err.message);
		} finally {
			setIsDownloading(false);
		}
	};

	const formatFileSize = (bytes)=>{
		if(bytes < 1024) return `${bytes} B`;
		if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const handleClose = ()=>{
		dialogRef.current?.close();
		onClose();
	};

	const handleKeyDown = (e)=>{
		if(e.key === 'Escape') {
			handleClose();
		}
	};

	return (
		<dialog ref={dialogRef} className='coverImageModal' onKeyDown={handleKeyDown}>
			<div className='modalHeader'>
				<h2><i className='fas fa-image' /> Download Cover Image</h2>
				<button className='closeButton' onClick={handleClose} title='Close'>
					<i className='fas fa-times' />
				</button>
			</div>

			<div className='modalContent'>
				<div className='infoBox'>
					<i className='fas fa-info-circle' />
					<span>
						Optimized for DriveThruRPG: {DTRPG_WIDTH}x{DTRPG_HEIGHT}px, 8.5x11 aspect ratio
					</span>
				</div>

				<div className='optionsSection'>
					<div className='optionGroup'>
						<label>Format</label>
						<div className='formatButtons'>
							<button
								className={format === 'jpeg' ? 'active' : ''}
								onClick={()=>setFormat('jpeg')}
								type='button'
							>
								JPG (Smaller)
							</button>
							<button
								className={format === 'png' ? 'active' : ''}
								onClick={()=>setFormat('png')}
								type='button'
							>
								PNG (Lossless)
							</button>
						</div>
					</div>

					{format === 'jpeg' && (
						<div className='optionGroup'>
							<label>Quality: {quality}%</label>
							<input
								type='range'
								min='50'
								max='100'
								value={quality}
								onChange={(e)=>setQuality(parseInt(e.target.value))}
							/>
							<span className='qualityHint'>
								{quality >= 85 ? 'Recommended for DriveThruRPG' : 'Lower quality = smaller file'}
							</span>
						</div>
					)}
				</div>

				<div className='previewSection'>
					<h3>Preview</h3>
					{isGenerating ? (
						<div className='loadingPreview'>
							<i className='fas fa-spinner fa-spin' />
							<span>Generating preview...</span>
						</div>
					) : preview ? (
						<>
							<div className='previewImage'>
								<img src={preview.dataUrl} alt='Cover preview' />
							</div>
							<div className='previewInfo'>
								<span className='dimensions'>
									<i className='fas fa-ruler-combined' /> {preview.dimensions.width} x {preview.dimensions.height}px
								</span>
								<span className='fileSize'>
									<i className='fas fa-file' /> {formatFileSize(preview.size)}
								</span>
								{format === 'jpeg' && preview.size > 400 * 1024 && (
									<span className='warning'>
										<i className='fas fa-exclamation-triangle' /> Above 400KB - consider lowering quality
									</span>
								)}
							</div>
						</>
					) : null}
				</div>

				{error && (
					<div className='errorMessage'>
						<i className='fas fa-exclamation-circle' /> {error}
					</div>
				)}
			</div>

			<div className='modalFooter'>
				<button className='cancelButton' onClick={handleClose} type='button'>
					Cancel
				</button>
				<button
					className='downloadButton'
					onClick={handleDownload}
					disabled={isGenerating || isDownloading || !preview}
					type='button'
				>
					{isDownloading ? (
						<><i className='fas fa-spinner fa-spin' /> Downloading...</>
					) : (
						<><i className='fas fa-download' /> Download</>
					)}
				</button>
			</div>
		</dialog>
	);
}
