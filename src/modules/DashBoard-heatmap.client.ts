// Use the real ServiceGapHeatmap component with Mapbox
document.addEventListener('DOMContentLoaded', () => {
	console.log('Heatmap initialization starting...');
	const container = document.getElementById('service-gap-heatmap-container');
	console.log('Container found:', !!container);
	console.log('Heatmap data available:', !!(window as any).heatmapData);
	console.log('Companies available:', !!(window as any).allCompanies);

	if (!container) {
		console.error('Container not found!');
		return;
	}

	// Import the real ServiceGapHeatmap component
	import('./ServiceGapHeatmap.client.ts').then((module) => {
		const ServiceGapHeatmap = module.default;

		// Clear container for the component
		container.innerHTML = '';

		try {
			// Create the heatmap with the current data
			const heatmap = new ServiceGapHeatmap('service-gap-heatmap-container', (window as any).heatmapData || [], (municipality) => {
				// Navigate to municipality page when clicked
				window.location.href = `/municipality/${encodeURIComponent(municipality.municipality)}`;
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
