import html2canvas from 'html2canvas';

// DriveThruRPG specifications
const DTRPG_WIDTH = 953;  // Maximum recommended width
const DTRPG_HEIGHT = 1233; // 8.5x11 ratio at 953px width (953 * 11/8.5)

/**
 * Captures the first page of the brew as an image
 * @param {Object} options - Configuration options
 * @param {string} options.format - 'png' or 'jpeg'
 * @param {number} options.quality - JPEG quality (0-1), default 0.85
 * @returns {Promise<{blob: Blob, dataUrl: string, size: number, dimensions: {width: number, height: number}}>}
 */
const captureFirstPage = async (options = {})=>{
	const {
		format = 'jpeg',
		quality = 0.85
	} = options;

	// Access the iframe content
	const iframe = window.frames['BrewRenderer'];
	if(!iframe) {
		throw new Error('Brew renderer not found');
	}

	const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
	const firstPage = iframeDoc.getElementById('p1');

	if(!firstPage) {
		throw new Error('First page not found');
	}

	// Wait for fonts to be ready
	if(iframeDoc.fonts && iframeDoc.fonts.ready) {
		await iframeDoc.fonts.ready;
	}

	// Calculate scale factor for target dimensions
	const pageWidth = firstPage.offsetWidth;
	const scale = DTRPG_WIDTH / pageWidth;

	// Capture with html2canvas
	const canvas = await html2canvas(firstPage, {
		scale             : scale,
		useCORS           : true,
		allowTaint        : false,
		backgroundColor   : '#ffffff',
		logging           : false,
		windowWidth       : firstPage.scrollWidth,
		windowHeight      : firstPage.scrollHeight,
		foreignObjectRendering : false,
		onclone           : (clonedDoc, element)=>{
			// Force visibility and remove any animations
			element.style.visibility = 'visible';
			element.style.animation = 'none';
		}
	});

	// Convert to desired format
	const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
	const dataUrl = canvas.toDataURL(mimeType, quality);

	// Convert to blob for download
	const response = await fetch(dataUrl);
	const blob = await response.blob();

	return {
		blob,
		dataUrl,
		size       : blob.size,
		dimensions : {
			width  : canvas.width,
			height : canvas.height
		}
	};
};

/**
 * Sanitizes a filename by removing/replacing invalid characters
 * @param {string} name - The filename to sanitize
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (name)=>{
	if(!name) return 'cover';
	return name
		.replace(/[<>:"/\\|?*]/g, '')
		.replace(/\s+/g, '_')
		.substring(0, 100) || 'cover';
};

/**
 * Triggers download of the cover image
 * @param {Object} options - Configuration options
 * @param {string} options.filename - Base filename without extension
 * @param {string} options.format - 'png' or 'jpeg'
 * @param {number} options.quality - JPEG quality (0-1)
 * @returns {Promise<{blob: Blob, dataUrl: string, size: number, dimensions: {width: number, height: number}}>}
 */
const downloadCoverImage = async (options = {})=>{
	const { filename = 'cover', format = 'jpeg' } = options;
	const result = await captureFirstPage(options);

	const extension = format === 'png' ? 'png' : 'jpg';
	const sanitizedName = sanitizeFilename(filename);
	const link = document.createElement('a');
	link.href = URL.createObjectURL(result.blob);
	link.download = `${sanitizedName}.${extension}`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(link.href);

	return result;
};

export {
	captureFirstPage,
	downloadCoverImage,
	sanitizeFilename,
	DTRPG_WIDTH,
	DTRPG_HEIGHT
};
