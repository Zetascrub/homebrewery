import './imageUploadModal.less';
import React, { useState, useRef, useEffect } from 'react';
import request from '../../utils/request-middleware.js';

export default function ImageUploadModal({ onClose, onInsert }){
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadedImages, setUploadedImages] = useState([]);
	const [error, setError] = useState(null);
	const [copied, setCopied] = useState(null);
	const [useImgchest, setUseImgchest] = useState(false);
	const [imgchestPrivacy, setImgchestPrivacy] = useState('hidden');

	const dialogRef = useRef(null);
	const fileInputRef = useRef(null);

	useEffect(()=>{
		dialogRef.current?.showModal();
	}, []);

	const handleClose = ()=>{
		dialogRef.current?.close();
		onClose();
	};

	const handleKeyDown = (e)=>{
		if(e.key === 'Escape') {
			handleClose();
		}
	};

	const handleDragOver = (e)=>{
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e)=>{
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e)=>{
		e.preventDefault();
		setIsDragging(false);
		const files = Array.from(e.dataTransfer.files);
		handleFiles(files);
	};

	const handleFileSelect = (e)=>{
		const files = Array.from(e.target.files);
		handleFiles(files);
	};

	const handleFiles = async (files)=>{
		const imageFiles = files.filter((f)=>f.type.startsWith('image/'));
		if(imageFiles.length === 0) {
			setError('No valid image files selected');
			return;
		}

		setIsUploading(true);
		setError(null);

		const endpoint = useImgchest ? '/api/images/upload-imgchest' : '/api/images/upload';

		for (const file of imageFiles) {
			try {
				const base64 = await fileToBase64(file);
				const payload = {
					filename : file.name,
					data     : base64
				};
				if(useImgchest) {
					payload.privacy = imgchestPrivacy;
				}

				const res = await request
					.post(endpoint)
					.send(payload);

				setUploadedImages((prev)=>[{
					...res.body,
					originalName : file.name,
					source       : useImgchest ? 'imgchest' : 'local'
				}, ...prev]);
			} catch (err) {
				setError(`Failed to upload ${file.name}: ${err.response?.body?.error || err.message}`);
			}
		}

		setIsUploading(false);
	};

	const fileToBase64 = (file)=>{
		return new Promise((resolve, reject)=>{
			const reader = new FileReader();
			reader.onload = ()=>resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const copyToClipboard = (url, type)=>{
		let text;
		if(type === 'markdown') {
			text = `![image](${url})`;
		} else if(type === 'background') {
			text = `background-image: url('${url}');`;
		} else {
			text = url;
		}
		navigator.clipboard.writeText(text);
		setCopied(url);
		setTimeout(()=>setCopied(null), 2000);
	};

	const handleInsert = (url)=>{
		if(onInsert) {
			onInsert(`![image](${url})`);
			handleClose();
		}
	};

	const formatSize = (bytes)=>{
		if(bytes < 1024) return `${bytes} B`;
		if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<dialog ref={dialogRef} className='imageUploadModal' onKeyDown={handleKeyDown}>
			<div className='modalHeader'>
				<h2><i className='fas fa-image' /> Upload Image</h2>
				<button className='closeButton' onClick={handleClose} title='Close'>
					<i className='fas fa-times' />
				</button>
			</div>

			<div className='modalContent'>
				<div className='uploadOptions'>
					<label className='toggleRow'>
						<span className='toggleLabel'>
							<i className='fas fa-cloud' />
							Upload to imgchest
						</span>
						<span
							className={`toggleSwitch ${useImgchest ? 'active' : ''}`}
							onClick={()=>setUseImgchest(!useImgchest)}
						>
							<span className='toggleKnob' />
						</span>
					</label>
					{useImgchest && (
						<label className='privacyRow'>
							<span className='privacyLabel'>Privacy:</span>
							<select
								value={imgchestPrivacy}
								onChange={(e)=>setImgchestPrivacy(e.target.value)}
							>
								<option value='hidden'>Hidden</option>
								<option value='secret'>Secret</option>
								<option value='public'>Public</option>
							</select>
						</label>
					)}
				</div>

				<div
					className={`dropZone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={()=>fileInputRef.current?.click()}
				>
					<input
						ref={fileInputRef}
						type='file'
						accept='image/*'
						multiple
						onChange={handleFileSelect}
						style={{ display: 'none' }}
					/>
					{isUploading ? (
						<>
							<i className='fas fa-spinner fa-spin' />
							<span>Uploading...</span>
						</>
					) : (
						<>
							<i className='fas fa-cloud-upload-alt' />
							<span>Drag & drop images here or click to browse</span>
							<small>PNG, JPG, GIF, WebP, SVG (max 10MB)</small>
						</>
					)}
				</div>

				{error && (
					<div className='errorMessage'>
						<i className='fas fa-exclamation-circle' /> {error}
					</div>
				)}

				{uploadedImages.length > 0 && (
					<div className='uploadedImages'>
						<h3>Uploaded Images</h3>
						{uploadedImages.map((img, idx)=>(
							<div key={idx} className='imageItem'>
								<div className='imagePreview'>
									<img src={img.url} alt={img.originalName} />
								</div>
								<div className='imageInfo'>
									<div className='imageName'>
										{img.filename}
										{img.source === 'imgchest' && <span className='sourceBadge imgchest'>imgchest</span>}
										{img.source === 'local' && <span className='sourceBadge local'>local</span>}
									</div>
									<div className='imageSize'>{formatSize(img.size)}</div>
									<div className='imageUrl'>
										<code>{img.url}</code>
									</div>
									<div className='imageActions'>
										<button
											onClick={()=>copyToClipboard(img.url, 'url')}
											title='Copy URL'
										>
											{copied === img.url ? <i className='fas fa-check' /> : <i className='fas fa-link' />}
											URL
										</button>
										<button
											onClick={()=>copyToClipboard(img.url, 'markdown')}
											title='Copy Markdown'
										>
											<i className='fas fa-code' />
											MD
										</button>
										<button
											onClick={()=>copyToClipboard(img.url, 'background')}
											title='Copy as CSS background'
										>
											<i className='fas fa-fill-drip' />
											CSS
										</button>
										{onInsert && (
											<button
												className='insertButton'
												onClick={()=>handleInsert(img.url)}
												title='Insert into document'
											>
												<i className='fas fa-file-import' />
												Insert
											</button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className='modalFooter'>
				<button className='closeButton' onClick={handleClose}>
					Close
				</button>
			</div>
		</dialog>
	);
}
