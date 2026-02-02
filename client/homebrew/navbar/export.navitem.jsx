import React, { useState } from 'react';
import Nav from './nav.jsx';
import { printCurrentBrew } from '../../../shared/helpers.js';
import CoverImageModal from './coverImageModal/coverImageModal.jsx';

export default function ExportNavItem({ brewTitle }){
	const [showCoverModal, setShowCoverModal] = useState(false);

	return (
		<>
			<Nav.dropdown>
				<Nav.item color='purple' icon='fas fa-file-export'>
					export
				</Nav.item>
				<Nav.item icon='far fa-file-pdf' onClick={printCurrentBrew}>
					get PDF
				</Nav.item>
				<Nav.item icon='far fa-image' onClick={()=>setShowCoverModal(true)}>
					cover image
				</Nav.item>
			</Nav.dropdown>
			{showCoverModal && (
				<CoverImageModal
					brewTitle={brewTitle}
					onClose={()=>setShowCoverModal(false)}
				/>
			)}
		</>
	);
}
