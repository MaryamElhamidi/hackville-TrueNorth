import ServiceGapHeatmap from './ServiceGapHeatmap.client.ts';

// Initialize heatmap
document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('service-gap-heatmap-container');
	if (container && (window as any).heatmapData) {
		try {
			const heatmap = new ServiceGapHeatmap('service-gap-heatmap-container', (window as any).heatmapData, (municipality) => {
				// Navigate to municipality page when clicked
				window.location.href = `/municipality/${encodeURIComponent(municipality.municipality)}`;
			});
		} catch (error) {
			console.error('Failed to initialize heatmap:', error);
			container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Failed to load heatmap. Please check your Mapbox access token.</div>';
		}
	}
});
