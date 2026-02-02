import React, { useState } from 'react';
import Nav from './nav.jsx';
import ImageUploadModal from './imageUploadModal/imageUploadModal.jsx';

export default function ImageUploadNavItem({ onInsert }){
	const [isOpen, setIsOpen] = useState(false);

	return <>
		<Nav.item
			color='green'
			icon='fas fa-image'
			onClick={()=>setIsOpen(true)}
		>
			images
		</Nav.item>
		{isOpen && (
			<ImageUploadModal
				onInsert={onInsert}
				onClose={()=>setIsOpen(false)}
			/>
		)}
	</>;
}
