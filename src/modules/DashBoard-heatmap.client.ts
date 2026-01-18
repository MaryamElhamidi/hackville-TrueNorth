// Use the real ServiceGapHeatmap component with Mapbox
document.addEventListener('DOMContentLoaded', () => {
	console.log('Heatmap initialization starting...');

	const initializeHeatmap = () => {
		const container = document.getElementById('service-gap-heatmap-container');
		console.log('Container found:', !!container);
		console.log('Heatmap data available:', !!(window as any).heatmapData);
		console.log('Heatmap data length:', (window as any).heatmapData?.length || 0);

		if (!container) {
			console.error('Container not found!');
			return;
		}

		// Use the real heatmap data
		const heatmapData = (window as any).heatmapData;
		if (!heatmapData || heatmapData.length === 0) {
			console.error('No heatmap data available!');
			container.innerHTML = `
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<div class="text-red-500 text-lg font-semibold mb-2">No Data Available</div>
						<div class="text-gray-600">Unable to load municipality data for the heatmap.</div>
						<div class="text-sm text-gray-500 mt-2">Please check if municipality_summaries.json exists.</div>
					</div>
				</div>
			`;
			return;
		}

		// Import the real ServiceGapHeatmap component
		import('./ServiceGapHeatmap.client.ts').then((module) => {
			const ServiceGapHeatmap = module.default;

			// Clear container for the component
			container.innerHTML = '';

			try {
				console.log('Creating heatmap with data:', heatmapData.length, 'points');

				// Create the heatmap with the current data
				const heatmap = new ServiceGapHeatmap('service-gap-heatmap-container', heatmapData, (municipality) => {
					// Navigate to municipality page when clicked with issue data
					console.log('Navigating to municipality:', municipality.municipality);

					// Prepare URL parameters with issue-specific data
					const params = new URLSearchParams({
						severity: municipality.severity,
						issues_count: municipality.issues_count.toString(),
						affected_populations: municipality.affected_populations.toString(),
						service_gap_types: municipality.service_gap_types.join(','),
						accessibility_barriers: municipality.accessibility_barriers.join(','),
						top_services_affected: municipality.top_services_affected.join(','),
						summary: municipality.summary
					});

					window.location.href = `/municipality/${encodeURIComponent(municipality.municipality)}?${params.toString()}`;
				});

				// Store reference to heatmap for company switching
				(window as any).currentHeatmap = heatmap;

				console.log('Mapbox heatmap initialized successfully!');
			} catch (error) {
				console.error('Failed to initialize Mapbox heatmap:', error);
				container.innerHTML = `
					<div class="flex items-center justify-center h-full">
						<div class="text-center">
							<div class="text-red-500 text-lg font-semibold mb-2">Mapbox Initialization Failed</div>
							<div class="text-gray-600">Unable to load the interactive map. Please check your Mapbox token.</div>
							<div class="text-sm text-gray-500 mt-2">Error: ${(error as Error).message}</div>
						</div>
					</div>
				`;
			}
		}).catch((error) => {
			console.error('Failed to load ServiceGapHeatmap component:', error);
			container.innerHTML = `
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<div class="text-red-500 text-lg font-semibold mb-2">Component Load Failed</div>
						<div class="text-gray-600">Unable to load the heatmap component.</div>
						<div class="text-sm text-gray-500 mt-2">Error: ${(error as Error).message}</div>
					</div>
				</div>
			`;
		});
	};

	// Start initialization
	initializeHeatmap();

	// Add company selector functionality
	const companySelector = document.getElementById('company-selector-heatmap') as HTMLSelectElement;
	if (companySelector) {
		// Get stored selection or default to first company
		const storedCompanyId = localStorage.getItem('selectedHeatmapCompany');
		const defaultCompanyId = companySelector.options.length > 0 ? companySelector.options[0].value : '';

		// Set initial selection
		companySelector.value = storedCompanyId || defaultCompanyId;

		// Prevent the dropdown from being reset
		let currentSelectedValue = companySelector.value;

		companySelector.addEventListener('change', (e) => {
			const selectedCompanyId = (e.target as HTMLSelectElement).value;
			currentSelectedValue = selectedCompanyId; // Update our tracking variable

			// Save selection to localStorage
			localStorage.setItem('selectedHeatmapCompany', selectedCompanyId);

			const companies = (window as any).allCompanies || [];
			const selectedCompany = companies.find((c: any) => c.companyId === selectedCompanyId);

			if (selectedCompany) {
				console.log('Selected company:', selectedCompany.companyName, 'Focus:', selectedCompany.geographicFocus);

				// Filter municipalities based on company's geographic focus
				let filteredMunicipalities = (window as any).originalMunicipalities || (window as any).heatmapData || [];
				let regionName = 'Canada';

				if (selectedCompany.geographicFocus.includes('Nationwide')) {
					// Show all municipalities for nationwide companies
					filteredMunicipalities = filteredMunicipalities;
					regionName = 'Canada';
				} else {
					// For now, since we don't have province data in municipalities,
					// we'll show all municipalities but mark the region
					// In a real implementation, you'd filter by province
					filteredMunicipalities = filteredMunicipalities;

					const provinces = selectedCompany.geographicFocus.filter((f: string) => f !== 'Nationwide');
					if (provinces.length === 1) {
						regionName = provinces[0];
					} else if (provinces.length > 1) {
						regionName = `${provinces.slice(0, 2).join(' & ')}${provinces.length > 2 ? ' +' : ''}`;
					}
				}

				// Add region info to data
				filteredMunicipalities = filteredMunicipalities.map((mun: any) => ({ ...mun, region: regionName }));

				// Update the heatmap data
				(window as any).heatmapData = filteredMunicipalities;

				// Update the Mapbox heatmap component if it exists
				if ((window as any).currentHeatmap) {
					(window as any).currentHeatmap.updateData(filteredMunicipalities);
				}

				console.log(`Switched to ${selectedCompany.companyName} - showing ${filteredMunicipalities.length} municipalities in ${regionName}`);
			}
		});

		// Ensure the dropdown maintains its selected value
		const maintainSelection = () => {
			if (companySelector.value !== currentSelectedValue) {
				companySelector.value = currentSelectedValue;
			}
		};

		// Check periodically to ensure selection is maintained
		setInterval(maintainSelection, 100);
	}
});
