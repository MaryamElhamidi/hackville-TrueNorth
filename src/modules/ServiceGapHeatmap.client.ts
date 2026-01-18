import { HeatmapDataPoint, SERVICE_GAP_TYPES, SEVERITY_LEVELS, filterHeatmapData, getOntarioCenter } from '../lib/dashboard/heatmap.js';

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFyeWFtZWxoYW1pZGkiLCJhIjoiY21rajZ3aHJiMTBhMDNlcHU4Z3h3c240biJ9.RCCa0OkAIeiv9Xq8fo2k3g';

interface HeatmapFilters {
  serviceGapTypes: string[];
  severityLevels: string[];
}

class ServiceGapHeatmap {
  private mapContainer: HTMLElement;

  private filtersPanel!: HTMLElement;

  private mapImage: HTMLImageElement | null = null;

  private overlayContainer: HTMLElement | null = null;

  private data: HeatmapDataPoint[] = [];

  private filters: HeatmapFilters = { serviceGapTypes: [], severityLevels: [] };

  private onMunicipalityClick?: (municipality: HeatmapDataPoint) => void;

  constructor(
    containerId: string,
    initialData: HeatmapDataPoint[],
    onClick?: (municipality: HeatmapDataPoint) => void
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`);
    }

    this.mapContainer = container;
    this.data = initialData;
    this.onMunicipalityClick = onClick || undefined;

    this.createUI();
    this.initializeStaticMap();
  }

  private createUI() {
    // Create filters panel
    this.filtersPanel = document.createElement('div');
    this.filtersPanel.className = 'w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto dark:bg-gray-800 dark:border-gray-700';
    this.filtersPanel.innerHTML = `
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
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
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

    // Create map container with static image and overlay
    const mapWrapper = document.createElement('div');
    mapWrapper.className = 'flex-1 relative';
    mapWrapper.innerHTML = `
      <div class="w-full h-full relative">
        <img id="static-map-image" class="w-full h-full object-cover" alt="Ontario Service Gap Map" />
        <div id="map-overlay" class="absolute inset-0"></div>
      </div>
    `;

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'w-full h-full flex';
    mainContainer.appendChild(this.filtersPanel);
    mainContainer.appendChild(mapWrapper);

    this.mapContainer.appendChild(mainContainer);

    // Get references to elements
    this.mapImage = document.getElementById('static-map-image') as HTMLImageElement;
    this.overlayContainer = document.getElementById('map-overlay') as HTMLElement;

    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Service gap type filters
    const serviceGapCheckboxes = this.filtersPanel.querySelectorAll('#service-gap-filters input');
    serviceGapCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.handleServiceGapFilterChange(target.value, target.checked);
      });
    });

    // Severity level filters
    const severityCheckboxes = this.filtersPanel.querySelectorAll('#severity-filters input');
    severityCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.handleSeverityFilterChange(target.value, target.checked);
      });
    });
  }

  private handleServiceGapFilterChange(type: string, checked: boolean) {
    if (checked) {
      this.filters.serviceGapTypes.push(type);
    } else {
      this.filters.serviceGapTypes = this.filters.serviceGapTypes.filter(t => t !== type);
    }
    this.updateFilters();
  }

  private handleSeverityFilterChange(level: string, checked: boolean) {
    if (checked) {
      this.filters.severityLevels.push(level);
    } else {
      this.filters.severityLevels = this.filters.severityLevels.filter(l => l !== level);
    }
    this.updateFilters();
  }

  private updateFilters() {
    console.log('Updating filters:', this.filters);
    const filteredData = filterHeatmapData(this.data, this.filters);
    console.log('Filtered data from', this.data.length, 'to', filteredData.length, 'municipalities');
    this.updateMapData(filteredData);

    // Update checkbox states to reflect current filter state
    this.updateCheckboxStates();
  }

  private updateCheckboxStates() {
    // Update service gap type checkboxes
    const serviceGapCheckboxes = this.filtersPanel.querySelectorAll('#service-gap-filters input');
    serviceGapCheckboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      input.checked = this.filters.serviceGapTypes.includes(input.value);
    });

    // Update severity level checkboxes
    const severityCheckboxes = this.filtersPanel.querySelectorAll('#severity-filters input');
    severityCheckboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      input.checked = this.filters.severityLevels.includes(input.value);
    });
  }

  private initializeStaticMap() {
    if (!this.mapImage || !this.overlayContainer) {
      console.error('Map elements not found');
      return;
    }

    // Generate static map URL for Ontario
    const staticMapUrl = this.generateStaticMapUrl(this.data);
    console.log('Generated static map URL:', staticMapUrl);

    this.mapImage.src = staticMapUrl;
    this.mapImage.onload = () => {
      console.log('Static map loaded successfully, adding markers for', this.data.length, 'municipalities');
      this.addMunicipalityMarkers();
    };
    this.mapImage.onerror = (error) => {
      console.error('Failed to load static map:', error);
    };
  }

  private generateStaticMapUrl(_data: HeatmapDataPoint[]): string {
    // Mapbox Static API URL structure:
    // https://api.mapbox.com/styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}@2x?access_token={access_token}

    const ontarioCenter = getOntarioCenter();
    const zoom = 6;
    const width = 800;
    const height = 600;

    // For static map, we'll just show a basic map without markers
    // The interactive markers will be overlaid on top
    // This avoids URL length limits with many municipalities

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${ontarioCenter[0]},${ontarioCenter[1]},${zoom},0,0/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }

  private addMunicipalityMarkers() {
    if (!this.overlayContainer || !this.mapImage) return;

    // Clear existing markers
    this.overlayContainer.innerHTML = '';

    // Get image dimensions
    const imgRect = this.mapImage.getBoundingClientRect();
    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;

    // Ontario bounds for coordinate conversion
    const ontarioBounds = {
      west: -95.2,
      east: -74.3,
      north: 56.9,
      south: 41.6
    };

    console.log('Adding markers for', this.data.length, 'municipalities');
    this.data.forEach(point => {
      // Convert lat/lng to pixel coordinates on the static map
      const x = ((point.longitude - ontarioBounds.west) / (ontarioBounds.east - ontarioBounds.west)) * imgWidth;
      const y = ((ontarioBounds.north - point.latitude) / (ontarioBounds.north - ontarioBounds.south)) * imgHeight;

      // Create marker element
      const markerElement = this.createMarkerElement(point, x, y);

      if (this.overlayContainer) {
        this.overlayContainer.appendChild(markerElement);
      }
    });
  }

  private createMarkerElement(point: HeatmapDataPoint, x: number, y: number): HTMLElement {
    // Create marker wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'municipality-marker-wrapper';
    wrapper.style.cssText = `
      position: absolute;
      left: ${x - 8}px;
      top: ${y - 8}px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      z-index: 10;
    `;

    // Create the actual marker
    const marker = document.createElement('div');
    marker.className = 'municipality-marker';
    marker.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: ${point.color};
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    `;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'municipality-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      padding: 12px;
      max-width: 300px;
      display: none;
      z-index: 20;
      font-family: inherit;
    `;
    tooltip.innerHTML = `
      <div class="font-semibold text-gray-900 text-sm">${point.municipality}</div>
      <div class="text-xs text-gray-600 mt-1">${point.summary}</div>
      <div class="text-xs text-gray-500 mt-2">${point.issues_count} issues • ${point.severity}</div>
    `;

    // Add hover effects
    wrapper.addEventListener('mouseenter', () => {
      marker.style.transform = 'scale(1.3)';
      marker.style.boxShadow = `0 4px 12px rgba(0,0,0,0.4), 0 0 15px ${point.color}40`;
      tooltip.style.display = 'block';
    });

    wrapper.addEventListener('mouseleave', () => {
      marker.style.transform = 'scale(1)';
      marker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      tooltip.style.display = 'none';
    });

    // Add click handler
    wrapper.addEventListener('click', () => {
      this.onMunicipalityClick?.(point);
    });

    wrapper.appendChild(marker);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  private updateMapData(data: HeatmapDataPoint[]) {
    this.data = data;
    console.log('Updating map data with', data.length, 'municipalities');

    // Update static map URL with filtered data
    if (this.mapImage && this.overlayContainer) {
      this.mapImage.src = this.generateStaticMapUrl(data);
      this.mapImage.onload = () => {
        this.addMunicipalityMarkers();
      };
    }
  }

  // Public methods
  updateData(newData: HeatmapDataPoint[]) {
    this.data = newData;
    this.updateFilters();
  }

  updateFiltersState(newFilters: HeatmapFilters) {
    this.filters = newFilters;

    // Update checkboxes
    const serviceGapCheckboxes = this.filtersPanel.querySelectorAll('#service-gap-filters input');
    serviceGapCheckboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      input.checked = this.filters.serviceGapTypes.includes(input.value);
    });

    const severityCheckboxes = this.filtersPanel.querySelectorAll('#severity-filters input');
    severityCheckboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      input.checked = this.filters.severityLevels.includes(input.value);
    });

    this.updateFilters();
  }

  destroy() {
    if (this.overlayContainer) {
      this.overlayContainer.innerHTML = '';
    }
  }
}

// Export for use in Astro components
export default ServiceGapHeatmap;
