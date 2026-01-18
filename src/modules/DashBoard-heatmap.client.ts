// Create a mock heatmap with filters UI (like the original ServiceGapHeatmap)
document.addEventListener('DOMContentLoaded', () => {
	console.log('Heatmap initialization starting...');
	const container = document.getElementById('service-gap-heatmap-container');
	console.log('Container found:', !!container);
	console.log('Heatmap data available:', !!(window as any).heatmapData);

	if (!container) {
		console.error('Container not found!');
		return;
	}

	// Import filter constants (similar to the original component)
	const SERVICE_GAP_TYPES = [
		'Healthcare',
		'Transportation',
		'Internet access',
		'Mental health support',
		'Disability services',
		'Other community resources'
	];

	const SEVERITY_LEVELS = ['minor', 'moderate', 'critical'];

	let currentFilters = {
		serviceGapTypes: [] as string[],
		severityLevels: [] as string[]
	};

	let filteredData = (window as any).heatmapData || [];

	// Create filters panel
	const createFiltersPanel = () => {
		const filtersPanel = document.createElement('div');
		filtersPanel.className = 'w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto dark:bg-gray-800 dark:border-gray-700';
		filtersPanel.innerHTML = `
			<h3 class="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Service Gap Filters</h3>

			<!-- Service Gap Types -->
			<div class="mb-6">
				<h4 class="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Service Gap Types</h4>
				<div class="space-y-2" id="service-gap-filters">
					${SERVICE_GAP_TYPES.map(type => `
						<label class="flex items-center">
							<input
								type="checkbox"
								value="${type}"
								class="filter-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
								data-filter-type="service"
							/>
							<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${type}</span>
						</label>
					`).join('')}
				</div>
			</div>

			<!-- Severity Levels -->
			<div class="mb-6">
				<h4 class="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Severity / Impact Level</h4>
				<div class="space-y-2" id="severity-filters">
					${SEVERITY_LEVELS.map(level => `
						<label class="flex items-center">
							<input
								type="checkbox"
								value="${level}"
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
								data-filter-type="severity"
							/>
							<span class="ml-2 text-sm text-gray-700 capitalize dark:text-gray-300">${level}</span>
						</label>
					`).join('')}
				</div>
			</div>

			<!-- Legend -->
			<div class="border-t pt-4 dark:border-gray-600">
				<h4 class="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Severity Legend</h4>
				<div class="space-y-2">
					<div class="flex items-center">
						<div class="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
						<span class="text-sm text-gray-700 dark:text-gray-300">Critical - Severe service gaps</span>
					</div>
					<div class="flex items-center">
						<div class="w-4 h-4 bg-orange-600 rounded-full mr-2"></div>
						<span class="text-sm text-gray-700 dark:text-gray-300">Moderate - Significant gaps</span>
					</div>
					<div class="flex items-center">
						<div class="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
						<span class="text-sm text-gray-700 dark:text-gray-300">Minor - Acceptable coverage</span>
					</div>
				</div>
			</div>
		`;

		// Add event listeners
		const serviceCheckboxes = filtersPanel.querySelectorAll('[data-filter-type="service"]');
		const severityCheckboxes = filtersPanel.querySelectorAll('[data-filter-type="severity"]');

		serviceCheckboxes.forEach(checkbox => {
			checkbox.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target.checked) {
					currentFilters.serviceGapTypes.push(target.value);
				} else {
					currentFilters.serviceGapTypes = currentFilters.serviceGapTypes.filter(t => t !== target.value);
				}
				updateFilters();
			});
		});

		severityCheckboxes.forEach(checkbox => {
			checkbox.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target.checked) {
					currentFilters.severityLevels.push(target.value);
				} else {
					currentFilters.severityLevels = currentFilters.severityLevels.filter(l => l !== target.value);
				}
				updateFilters();
			});
		});

		return filtersPanel;
	};

	// Create mock map with better projection
	const createMockMap = (data: any[]) => {
		console.log('Creating mock Ontario map with data:', data.length, 'points');

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '100%');
		svg.setAttribute('height', '100%');
		svg.setAttribute('viewBox', '0 0 1000 700');
		svg.style.backgroundColor = '#f8fafc';

		// Add Ontario outline (more detailed and realistic)
		const ontario = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		ontario.setAttribute('d', 'M300,150 L700,120 L780,200 L800,350 L720,420 L650,480 L580,520 L500,540 L420,520 L350,480 L280,420 L250,350 L270,250 Z');
		ontario.setAttribute('fill', '#e2e8f0');
		ontario.setAttribute('stroke', '#64748b');
		ontario.setAttribute('stroke-width', '3');
		svg.appendChild(ontario);

		// Add "Ontario" label
		const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		label.setAttribute('x', '500');
		label.setAttribute('y', '80');
		label.setAttribute('text-anchor', 'middle');
		label.setAttribute('font-size', '28');
		label.setAttribute('font-weight', 'bold');
		label.setAttribute('fill', '#374151');
		label.textContent = 'Ontario - Accessibility Service Gaps';
		svg.appendChild(label);

		// Better coordinate projection for Ontario municipalities
		const projectCoordinates = (lat: number, lng: number) => {
			// Ontario bounds: roughly 41.7°N to 56.9°N, 74.3°W to 95.2°W
			const minLat = 41.7, maxLat = 56.9;
			const minLng = -95.2, maxLng = -74.3;

			// Normalize coordinates
			const normLat = (lat - minLat) / (maxLat - minLat);
			const normLng = (lng - minLng) / (maxLng - minLng);

			// Project to SVG coordinates (with some padding)
			const svgX = 320 + (normLng * 480); // 320-800 range
			const svgY = 180 + ((1 - normLat) * 340); // 180-520 range (inverted Y)

			return { x: svgX, y: svgY };
		};

		// Plot municipalities with better distribution
		data.forEach((point) => {
			const coords = projectCoordinates(point.latitude, point.longitude);
			const { x, y } = coords;

			// Skip if coordinates are out of bounds
			if (x < 300 || x > 800 || y < 150 || y > 550) return;

			// Create marker
			const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			marker.setAttribute('cx', x.toString());
			marker.setAttribute('cy', y.toString());
			marker.setAttribute('r', '10');

			// Color based on severity
			let color = '#10b981'; // green - minor
			if (point.severity === 'moderate') color = '#f59e0b'; // orange
			if (point.severity === 'critical') color = '#dc2626'; // red

			marker.setAttribute('fill', color);
			marker.setAttribute('stroke', '#ffffff');
			marker.setAttribute('stroke-width', '3');
			marker.style.cursor = 'pointer';
			marker.setAttribute('data-municipality', point.municipality);

			// Add hover effect
			marker.addEventListener('mouseenter', () => {
				marker.setAttribute('r', '15');
			});
			marker.addEventListener('mouseleave', () => {
				marker.setAttribute('r', '10');
			});

			// Add click handler
			marker.addEventListener('click', () => {
				window.location.href = `/municipality/${encodeURIComponent(point.municipality)}`;
			});

			svg.appendChild(marker);

			// Add label (only for some municipalities to avoid clutter)
			if (Math.random() > 0.7) { // Show ~30% of labels
				const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				text.setAttribute('x', (x + 15).toString());
				text.setAttribute('y', (y + 5).toString());
				text.setAttribute('font-size', '11');
				text.setAttribute('fill', '#374151');
				text.setAttribute('font-weight', '500');
				text.textContent = point.municipality.length > 15 ? point.municipality.substring(0, 12) + '...' : point.municipality;
				svg.appendChild(text);
			}
		});

		// Add city markers for major centers
		const majorCities = [
			{ name: 'Toronto', lat: 43.6532, lng: -79.3832 },
			{ name: 'Ottawa', lat: 45.4215, lng: -75.6972 },
			{ name: 'Hamilton', lat: 43.2557, lng: -79.8711 },
			{ name: 'London', lat: 42.9849, lng: -81.2453 },
			{ name: 'Thunder Bay', lat: 48.3809, lng: -89.2477 }
		];

		majorCities.forEach(city => {
			const coords = projectCoordinates(city.lat, city.lng);
			const { x, y } = coords;

			const cityMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			cityMarker.setAttribute('cx', x.toString());
			cityMarker.setAttribute('cy', y.toString());
			cityMarker.setAttribute('r', '6');
			cityMarker.setAttribute('fill', '#6b7280');
			cityMarker.setAttribute('stroke', '#ffffff');
			cityMarker.setAttribute('stroke-width', '2');
			svg.appendChild(cityMarker);

			const cityLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			cityLabel.setAttribute('x', (x + 10).toString());
			cityLabel.setAttribute('y', (y + 4).toString());
			cityLabel.setAttribute('font-size', '10');
			cityLabel.setAttribute('fill', '#6b7280');
			cityLabel.setAttribute('font-weight', 'bold');
			cityLabel.textContent = city.name;
			svg.appendChild(cityLabel);
		});

		return svg;
	};

	const updateFilters = () => {
		const originalData = (window as any).heatmapData || [];
		filteredData = originalData.filter((point: any) => {
			// Filter by service gap types (if any selected)
			if (currentFilters.serviceGapTypes.length > 0) {
				const hasMatchingType = point.service_gap_types?.some((type: string) =>
					currentFilters.serviceGapTypes.includes(type)
				);
				if (!hasMatchingType) return false;
			}

			// Filter by severity levels (if any selected)
			if (currentFilters.severityLevels.length > 0) {
				if (!currentFilters.severityLevels.includes(point.severity)) return false;
			}

			return true;
		});

		// Re-render map with filtered data
		const mapContainer = container.querySelector('.map-container');
		if (mapContainer) {
			const newMap = createMockMap(filteredData);
			mapContainer.innerHTML = '';
			mapContainer.appendChild(newMap);
		}

		console.log('Filtered data:', filteredData.length, 'points');
	};

	// Clear container and create UI
	container.innerHTML = '';

	if ((window as any).heatmapData && (window as any).heatmapData.length > 0) {
		console.log('Creating mock heatmap with data:', (window as any).heatmapData.length, 'points');

		// Create main container with flex layout (map + filters)
		const mainContainer = document.createElement('div');
		mainContainer.className = 'w-full flex';
		mainContainer.style.height = 'calc(100% - 80px)'; // Leave space for footer

		// Add filters panel
		const filtersPanel = createFiltersPanel();
		mainContainer.appendChild(filtersPanel);

		// Add map container
		const mapWrapper = document.createElement('div');
		mapWrapper.className = 'flex-1 relative map-container';
		mapWrapper.style.height = '100%';

		const mockMap = createMockMap((window as any).heatmapData);
		mapWrapper.appendChild(mockMap);
		mainContainer.appendChild(mapWrapper);

		// Add footer with legend and instructions (outside flex container)
		const footer = document.createElement('div');
		footer.className = 'w-full bg-gray-50 border-t border-gray-200 px-6 py-4 dark:bg-gray-800 dark:border-gray-700';
		footer.style.height = '80px';
		footer.innerHTML = `
			<div class="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 h-full">
				<div class="flex items-center">
					<div class="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
					<span>Critical - Severe service gaps</span>
				</div>
				<div class="flex items-center">
					<div class="w-4 h-4 bg-orange-600 rounded-full mr-2"></div>
					<span>Moderate - Significant gaps</span>
				</div>
				<div class="flex items-center">
					<div class="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
					<span>Minor - Acceptable coverage</span>
				</div>
				<div class="text-center text-gray-500 dark:text-gray-500 mt-2">
					Click on any municipality marker to view detailed analysis
				</div>
			</div>
		`;

		container.appendChild(mainContainer);
		container.appendChild(footer);

		// Initialize filtered data
		filteredData = (window as any).heatmapData;

		console.log('Mock heatmap with filters created successfully!');
	} else {
		console.error('No heatmap data available');
		container.innerHTML = `
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<div class="text-red-500 text-lg font-semibold mb-2">No Heatmap Data</div>
					<div class="text-gray-600">Unable to load municipality data for the heatmap.</div>
					<div class="text-sm text-gray-500 mt-2">Data: ${JSON.stringify((window as any).heatmapData)}</div>
				</div>
			</div>
		`;
	}
});
