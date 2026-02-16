import React, { useState } from 'react';
import Nav from './nav.jsx';
import DndImportModal from './dndImportModal/dndImportModal.jsx';

export default function DndImportNavItem({ onInsert }){
	const [isOpen, setIsOpen] = useState(false);

	return <>
		<Nav.item
			color='red'
			icon='fas fa-dragon'
			onClick={()=>setIsOpen(true)}
		>
			D&D import
		</Nav.item>
		{isOpen && (
			<DndImportModal
				onInsert={onInsert}
				onClose={()=>setIsOpen(false)}
			/>
		)}
	</>;
}
