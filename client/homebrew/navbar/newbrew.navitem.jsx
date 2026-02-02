import React, { useState } from 'react';
import _ from 'lodash';
import Nav from './nav.jsx';
import request from '../utils/request-middleware.js';
import { splitTextStyleAndMetadata } from '../../../shared/helpers.js';

const BREWKEY  = 'HB_newPage_content';
const STYLEKEY = 'HB_newPage_style';
const METAKEY = 'HB_newPage_meta';

// Regex to find external image URLs (common image hosts)
const EXTERNAL_IMAGE_REGEX = /https?:\/\/(?:cdn\.imgchest\.com|i\.imgur\.com|imgur\.com|i\.redd\.it|preview\.redd\.it|images\.unsplash\.com|i\.ibb\.co)\/[^\s)"']+\.(?:png|jpg|jpeg|gif|webp)/gi;

const NewBrew = ()=>{
	const [isImporting, setIsImporting] = useState(false);
	const [importStatus, setImportStatus] = useState('');

	const findExternalImages = (content)=>{
		const matches = content.match(EXTERNAL_IMAGE_REGEX) || [];
		return [...new Set(matches)]; // Remove duplicates
	};

	const importExternalImages = async (urls)=>{
		if(urls.length === 0) return {};

		try {
			const res = await request
				.post('/api/images/import')
				.send({ urls });
			return res.body.urlMapping || {};
		} catch (err) {
			console.error('Failed to import images:', err);
			return {};
		}
	};

	const replaceImageUrls = (content, urlMapping)=>{
		let result = content;
		for (const [originalUrl, localUrl] of Object.entries(urlMapping)) {
			result = result.split(originalUrl).join(localUrl);
		}
		return result;
	};

	const handleFileChange = async (e)=>{
		const file = e.target.files[0];
		if(!file) return;

		if(!confirmLocalStorageChange()) return;

		const reader = new FileReader();
		reader.onload = async (e)=>{
			let fileContent = e.target.result;
			const newBrew = { text: fileContent, style: '' };

			if(!fileContent.startsWith('```metadata')) {
				const type = file.name.split('.').pop().toLowerCase();
				alert(`This file is invalid: ${!type ? 'Missing file extension' :`.${type} files are not supported`}. Only .txt files exported from the Homebrewery are allowed.`);
				return;
			}

			// Check for external images
			const externalUrls = findExternalImages(fileContent);

			if(externalUrls.length > 0) {
				const shouldImport = confirm(
					`Found ${externalUrls.length} external image(s) from hosts like imgchest.\n\n` +
					`Would you like to import them to your local server?\n` +
					`This will make the images load faster and work with cover image export.\n\n` +
					`Click OK to import, or Cancel to keep external URLs.`
				);

				if(shouldImport) {
					setIsImporting(true);
					setImportStatus(`Importing ${externalUrls.length} images...`);

					try {
						const urlMapping = await importExternalImages(externalUrls);
						const importedCount = Object.keys(urlMapping).length;

						if(importedCount > 0) {
							fileContent = replaceImageUrls(fileContent, urlMapping);
							newBrew.text = fileContent;
							setImportStatus(`Imported ${importedCount} of ${externalUrls.length} images`);
						}
					} catch (err) {
						console.error('Image import failed:', err);
						setImportStatus('Import failed, using original URLs');
					}

					// Small delay to show status
					await new Promise((r)=>setTimeout(r, 1000));
					setIsImporting(false);
					setImportStatus('');
				}
			}

			splitTextStyleAndMetadata(newBrew);
			localStorage.setItem(BREWKEY, newBrew.text);
			localStorage.setItem(STYLEKEY, newBrew.style);
			localStorage.setItem(METAKEY, JSON.stringify(
				_.pick(newBrew, ['title', 'description', 'tags', 'systems', 'renderer', 'theme', 'lang'])
			));
			window.location.href = '/new';
		};
		reader.readAsText(file);
	};

	const confirmLocalStorageChange = ()=>{
		const currentText  = localStorage.getItem(BREWKEY);
		const currentStyle = localStorage.getItem(STYLEKEY);
		const currentMeta  = localStorage.getItem(METAKEY);

		return (!(currentText || currentStyle || currentMeta) || confirm(
			`You have made changes in the new brew space. If you continue, that information will be PERMANENTLY LOST.\nAre you sure you wish to continue?`
		));
	};

	const clearLocalStorage = ()=>{
		if(!confirmLocalStorageChange()) return;

		localStorage.removeItem(BREWKEY);
		localStorage.removeItem(STYLEKEY);
		localStorage.removeItem(METAKEY);

		window.location.href = '/new';
		return;
	};

	return (
		<>
			<input id='uploadTxt' type='file' accept='.txt' onChange={handleFileChange} style={{ display: 'none' }} />
			{isImporting && (
				<div style={{
					position        : 'fixed',
					top             : 0,
					left            : 0,
					right           : 0,
					bottom          : 0,
					backgroundColor : 'rgba(0,0,0,0.7)',
					display         : 'flex',
					alignItems      : 'center',
					justifyContent  : 'center',
					zIndex          : 9999,
					color           : 'white',
					fontSize        : '18px',
					flexDirection   : 'column',
					gap             : '10px'
				}}>
					<i className='fas fa-spinner fa-spin' style={{ fontSize: '32px' }} />
					<div>{importStatus}</div>
				</div>
			)}
			<Nav.dropdown>
				<Nav.item
					className='new'
					color='purple'
					icon='fa-solid fa-plus-square'>
						new
				</Nav.item>
				<Nav.item
					className='new'
					href='/new'
					newTab={true}
					color='purple'
					icon='fa-solid fa-file'>
						resume draft
				</Nav.item>
				<Nav.item
					className='fromBlank'
					newTab={true}
					color='yellow'
					icon='fa-solid fa-file-circle-plus'
					onClick={()=>{ clearLocalStorage(); }}>
						from blank
				</Nav.item>
				<Nav.item
					className='fromFile'
					color='green'
					icon='fa-solid fa-upload'
					onClick={()=>{ document.getElementById('uploadTxt').click(); }}>
						from file
				</Nav.item>
			</Nav.dropdown>
		</>
	);
};

export default NewBrew;
