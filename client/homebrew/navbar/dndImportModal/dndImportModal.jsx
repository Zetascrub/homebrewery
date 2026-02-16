import './dndImportModal.less';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatMonster, formatSpell, formatMagicItem } from './formatters.js';

const SEARCH_TYPES = [
	{ value: 'monsters',    label: 'Monsters',    icon: 'fas fa-skull-crossbones' },
	{ value: 'spells',      label: 'Spells',      icon: 'fas fa-magic' },
	{ value: 'magicitems',  label: 'Magic Items', icon: 'fas fa-gem' },
];

const API_BASE = 'https://api.open5e.com/v1';

// Simple in-memory cache to reduce API calls
const searchCache = {};
function getCacheKey(query, type) { return `${type}:${query.toLowerCase().trim()}`; }

function getSubtitle(item, type) {
	if(type === 'monsters') return `CR ${item.challenge_rating} · ${item.size} ${item.type}`;
	if(type === 'spells') return `${item.level || 'Cantrip'} · ${item.school}`;
	if(type === 'magicitems') return `${item.rarity || ''} ${item.type || ''}`.trim();
	return '';
}

function formatItem(item, type) {
	if(type === 'monsters') return formatMonster(item);
	if(type === 'spells') return formatSpell(item);
	if(type === 'magicitems') return formatMagicItem(item);
	return '';
}

export default function DndImportModal({ onClose, onInsert }){
	const [searchQuery, setSearchQuery] = useState('');
	const [searchType, setSearchType] = useState('monsters');
	const [results, setResults] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [preview, setPreview] = useState('');
	const [error, setError] = useState(null);
	const [totalCount, setTotalCount] = useState(0);
	const [copied, setCopied] = useState(false);

	const dialogRef = useRef(null);
	const debounceRef = useRef(null);

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

	const doSearch = useCallback(async (query, type)=>{
		if(!query || query.length < 2) {
			setResults([]);
			setTotalCount(0);
			return;
		}

		// Check cache first
		const cacheKey = getCacheKey(query, type);
		if(searchCache[cacheKey]) {
			setResults(searchCache[cacheKey].results);
			setTotalCount(searchCache[cacheKey].count);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const url = `${API_BASE}/${type}/?search=${encodeURIComponent(query)}&limit=20&format=json`;
			const res = await fetch(url);

			if(!res.ok) throw new Error(`API returned ${res.status}`);

			const data = await res.json();
			const fetchedResults = data.results || [];
			const fetchedCount = data.count || 0;

			// Cache the results
			searchCache[cacheKey] = { results: fetchedResults, count: fetchedCount };

			setResults(fetchedResults);
			setTotalCount(fetchedCount);
		} catch (err) {
			setError(`Search failed: ${err.message}`);
			setResults([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleSearchChange = (e)=>{
		const query = e.target.value;
		setSearchQuery(query);
		setSelectedItem(null);
		setPreview('');

		if(debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(()=>doSearch(query, searchType), 300);
	};

	const handleTypeChange = (type)=>{
		setSearchType(type);
		setSelectedItem(null);
		setPreview('');
		setResults([]);
		setTotalCount(0);

		if(searchQuery.length >= 2) {
			if(debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(()=>doSearch(searchQuery, type), 300);
		}
	};

	const handleSelect = (item)=>{
		setSelectedItem(item);
		setPreview(formatItem(item, searchType));
		setCopied(false);
	};

	const handleInsert = ()=>{
		if(onInsert && preview) {
			onInsert(preview);
			handleClose();
		}
	};

	const handleCopy = ()=>{
		if(preview) {
			navigator.clipboard.writeText(preview);
			setCopied(true);
			setTimeout(()=>setCopied(false), 2000);
		}
	};

	return (
		<dialog ref={dialogRef} className='dndImportModal' onKeyDown={handleKeyDown}>
			<div className='dndModalInner'>

				<div className='dndHeader'>
					<h2><i className='fas fa-dragon' /> Import D&D Content</h2>
					<button className='dndCloseBtn' onClick={handleClose} title='Close'>
						<i className='fas fa-times' />
					</button>
				</div>

				<div className='dndTypeTabs'>
					{SEARCH_TYPES.map((t)=>(
						<button
							key={t.value}
							className={`dndTypeTab ${searchType === t.value ? 'active' : ''}`}
							onClick={()=>handleTypeChange(t.value)}
						>
							<i className={t.icon} /> {t.label}
						</button>
					))}
				</div>

				<div className='dndSearchBar'>
					<i className='fas fa-search' />
					<input
						type='text'
						placeholder={`Search ${SEARCH_TYPES.find((t)=>t.value === searchType)?.label.toLowerCase()}...`}
						value={searchQuery}
						onChange={handleSearchChange}
						autoFocus
					/>
					{isLoading && <i className='fas fa-spinner fa-spin dndSpinner' />}
				</div>

				{error && (
					<div className='dndError'>
						<i className='fas fa-exclamation-circle' /> {error}
					</div>
				)}

				<div className='dndBody'>
					<div className='dndResultsList'>
						{results.length === 0 && searchQuery.length < 2 && !isLoading && (
							<div className='dndPlaceholder'>
								<i className='fas fa-search' />
								<span>Type to search</span>
							</div>
						)}
						{results.length === 0 && searchQuery.length >= 2 && !isLoading && (
							<div className='dndPlaceholder'>
								<i className='fas fa-times-circle' />
								<span>No results found</span>
							</div>
						)}
						{results.length > 0 && (
							<div className='dndResultsCount'>
								{totalCount} result{totalCount !== 1 ? 's' : ''}
							</div>
						)}
						{results.map((item)=>(
							<div
								key={item.slug}
								className={`dndResultItem ${selectedItem?.slug === item.slug ? 'selected' : ''}`}
								onClick={()=>handleSelect(item)}
							>
								<div className='dndResultName'>{item.name}</div>
								<div className='dndResultMeta'>{getSubtitle(item, searchType)}</div>
								{item.document__title && (
									<div className='dndResultSource'>{item.document__title}</div>
								)}
							</div>
						))}
					</div>

					<div className='dndPreview'>
						{!selectedItem && (
							<div className='dndPlaceholder'>
								<i className='fas fa-mouse-pointer' />
								<span>Select an item to preview</span>
							</div>
						)}
						{selectedItem && <>
							<div className='dndPreviewHeader'>
								<h3>{selectedItem.name}</h3>
								<div className='dndPreviewBtns'>
									<button className='dndCopyBtn' onClick={handleCopy}>
										<i className={copied ? 'fas fa-check' : 'fas fa-copy'} />
										{copied ? 'Copied' : 'Copy'}
									</button>
									{onInsert && (
										<button className='dndInsertBtn' onClick={handleInsert}>
											<i className='fas fa-file-import' /> Insert
										</button>
									)}
								</div>
							</div>
							<pre className='dndPreviewCode'>{preview}</pre>
						</>}
					</div>
				</div>

				<div className='dndFooter'>
					<span className='dndCredit'>
						Powered by <a href='https://open5e.com' target='_blank' rel='noopener noreferrer'>Open5e</a>
					</span>
					<button className='dndFooterClose' onClick={handleClose}>Close</button>
				</div>

			</div>
		</dialog>
	);
}
