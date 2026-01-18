import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { HeatmapDataPoint, SERVICE_GAP_TYPES, SEVERITY_LEVELS, filterHeatmapData, getOntarioBounds, getOntarioCenter } from '../lib/dashboard/heatmap.js';

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFyeWFtZWxoYW1pZGkiLCJhIjoiY21rajZ3aHJiMTBhMDNlcHU4Z3h3c240biJ9.RCCa0OkAIeiv9Xq8fo2k3g';

interface HeatmapFilters {
  serviceGapTypes: string[];
  severityLevels: string[];
}

class ServiceGapHeatmap {
  private mapContainer: HTMLElement;
  private filtersPanel: HTMLElement;
  private map: mapboxgl.Map | null = null;
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
    this.onMunicipalityClick = onClick;

    this.createUI();
    this.initializeMap();
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

    // Create map container
    const mapWrapper = document.createElement('div');
    mapWrapper.className = 'flex-1 relative';
    const mapDiv = document.createElement('div');
    mapDiv.className = 'w-full h-full';
    mapDiv.id = 'service-gap-map';
    mapWrapper.appendChild(mapDiv);

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'w-full h-full flex';
    mainContainer.appendChild(this.filtersPanel);
    mainContainer.appendChild(mapWrapper);

    this.mapContainer.appendChild(mainContainer);

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
    const filteredData = filterHeatmapData(this.data, this.filters);
    this.updateMapData(filteredData);
  }

  private initializeMap() {
    console.log('Initializing Mapbox map...');
    const mapElement = document.getElementById('service-gap-map');
    console.log('Map element found:', !!mapElement);

    if (!mapElement) {
      console.error('Map element not found!');
      return;
    }

    try {
      console.log('Setting Mapbox access token:', MAPBOX_ACCESS_TOKEN ? 'Token present' : 'No token');
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      console.log('Creating Mapbox map...');
      const ontarioBounds = getOntarioBounds();
      const ontarioCenter = getOntarioCenter();
      console.log('Ontario bounds:', ontarioBounds);
      console.log('Ontario center:', ontarioCenter);

      this.map = new mapboxgl.Map({
        container: 'service-gap-map',
        style: 'mapbox://styles/mapbox/outdoors-v12', // More detailed style better for Canadian geography
        center: ontarioCenter, // Ontario center
        zoom: 6,
        maxBounds: ontarioBounds, // Strict Ontario bounds - cannot pan outside
        fitBoundsOptions: {
          padding: 20, // Reduced padding to stay within bounds
          maxZoom: 10
        },
        // Strictly enforce Ontario bounds - NO BORDERING AREAS
        minZoom: 6, // Start zoomed in to show Ontario clearly
        maxZoom: 12,
        // Restrict interactions to prevent viewing outside Ontario
        boxZoom: false, // Disable box zoom to prevent edge cases
        dragPan: true, // Allow panning but strictly within bounds
        dragRotate: false, // No rotation
        scrollZoom: true, // Allow zoom but respect bounds
        touchZoomRotate: false, // No touch rotation
        doubleClickZoom: false, // Disable double-click zoom that might go outside bounds
        keyboard: false, // Disable keyboard navigation
        // Force initial view to be Ontario-only
        bearing: 0,
        pitch: 0
      });

      // Add a mask layer to hide everything outside Ontario
      this.map.on('load', () => {
        // Create a polygon that covers everything EXCEPT Ontario
        // This will make only Ontario visible
        const boundsForMask = getOntarioBounds();
        const maskPolygon = {
          type: 'FeatureCollection' as const,
          features: [{
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                // Outer ring (world bounds)
                [
                  [-180, -85],
                  [180, -85],
                  [180, 85],
                  [-180, 85],
                  [-180, -85]
                ],
                // Inner ring (Ontario - this creates a hole)
                [
                  [boundsForMask[0][0], boundsForMask[0][1]], // SW corner
                  [boundsForMask[1][0], boundsForMask[0][1]], // SE corner
                  [boundsForMask[1][0], boundsForMask[1][1]], // NE corner
                  [boundsForMask[0][0], boundsForMask[1][1]], // NW corner
                  [boundsForMask[0][0], boundsForMask[0][1]]  // Close polygon
                ]
              ]
            }
          }]
        };

        // Add the mask layer
        this.map!.addSource('ontario-mask', {
          type: 'geojson',
          data: maskPolygon as GeoJSON.FeatureCollection
        });

        this.map!.addLayer({
          id: 'ontario-mask-layer',
          type: 'fill',
          source: 'ontario-mask',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': 0.85
          }
        });

        // Add a subtle border around Ontario
        this.map!.addLayer({
          id: 'ontario-border',
          type: 'line',
          source: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection' as const,
              features: [{
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'Polygon' as const,
                  coordinates: [
                    [
                      [boundsForMask[0][0], boundsForMask[0][1]], // SW corner
                      [boundsForMask[1][0], boundsForMask[0][1]], // SE corner
                      [boundsForMask[1][0], boundsForMask[1][1]], // NE corner
                      [boundsForMask[0][0], boundsForMask[1][1]], // NW corner
                      [boundsForMask[0][0], boundsForMask[0][1]]  // Close polygon
                    ]
                  ]
                }
              }]
            } as GeoJSON.FeatureCollection
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
            'line-opacity': 0.8
          }
        });
      });

      console.log('Map created successfully, waiting for load event...');

      this.map.on('load', () => {
        console.log('Map loaded successfully, adding layers...');
        this.addHeatmapLayer();
        this.addMunicipalityMarkers();
        console.log('Heatmap layers added successfully');
      });

      this.map.on('error', (e) => {
        console.error('Mapbox map error:', e);
      });

    } catch (error) {
      console.error('Failed to initialize Mapbox map:', error);
    }
  }

  private addHeatmapLayer() {
    if (!this.map) return;

    // Add heatmap source
    this.map.addSource('service-gaps', {
      type: 'geojson',
      data: this.createGeoJSON(this.data)
    });

    // Add heatmap layer
    this.map.addLayer({
      id: 'service-gaps-heatmap',
      type: 'heatmap',
      source: 'service-gaps',
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'intensity'],
          0, 0,
          1, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgba(16, 185, 129, 0.5)', // Green
          0.4, 'rgba(245, 158, 11, 0.6)', // Orange
          0.6, 'rgba(239, 68, 68, 0.7)',  // Red
          1, 'rgba(185, 28, 28, 0.8)'     // Dark red
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          9, 20
        ],
        'heatmap-opacity': 0.7
      }
    });
  }

  private addMunicipalityMarkers() {
    if (!this.map) return;

    // Add markers for each municipality
    this.data.forEach(point => {
      const markerElement = this.createMarkerElement(point);

      // Create a custom marker with proper anchoring
      new mapboxgl.Marker({
        element: markerElement,
        anchor: 'center', // Anchor to center of marker
        offset: [0, 0]    // No offset to prevent stretching
      })
        .setLngLat([point.longitude, point.latitude])
        .addTo(this.map!);

      // Create popup for hover with proper anchoring
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'municipality-popup',
        anchor: 'bottom', // Anchor popup to bottom of marker
        offset: [0, 15]   // Small offset to prevent overlap
      });

      // Get top 1-3 services affected as summary
      const topServices = point.top_services_affected?.slice(0, 3) || [];
      const servicesText = topServices.length > 0 ? topServices.join(', ') : 'Various services';

      popup.setHTML(`
        <div class="p-3">
          <div class="font-semibold text-gray-900 text-sm">${point.municipality}</div>
          <div class="text-xs text-gray-600 mt-1">${servicesText}</div>
          <div class="text-xs text-gray-500 mt-1">${point.issues_count} issues • ${point.severity}</div>
        </div>
      `);

      // Add hover events with proper anchoring
      markerElement.addEventListener('mouseenter', () => {
        // Ensure popup is positioned exactly at marker location
        popup.setLngLat([point.longitude, point.latitude]).addTo(this.map!);
      });

      markerElement.addEventListener('mouseleave', () => {
        popup.remove();
      });

      // Add click handler
      markerElement.addEventListener('click', () => {
        this.onMunicipalityClick?.(point);
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private createMarkerElement(point: HeatmapDataPoint): HTMLElement {
    // Create a wrapper to isolate transform effects from Mapbox positioning
    const wrapper = document.createElement('div');
    wrapper.className = 'municipality-marker-wrapper';
    wrapper.style.cssText = `
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 10;
    `;

    // Create the actual marker inside the wrapper
    const marker = document.createElement('div');
    marker.className = 'municipality-marker';
    marker.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${point.color};
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    `;

    // Add a subtle glow effect for better visibility
    marker.style.boxShadow = `
      0 2px 8px rgba(0,0,0,0.3),
      0 0 0 2px rgba(255,255,255,0.8) inset
    `;

    // Add hover effects to the inner marker only, not the wrapper
    marker.addEventListener('mouseenter', () => {
      // Only scale the inner marker, not the wrapper
      marker.style.transform = 'scale(1.3)';
      marker.style.zIndex = '20';
      marker.style.boxShadow = `
        0 4px 12px rgba(0,0,0,0.4),
        0 0 15px ${point.color}40
      `;
      marker.style.outline = '2px solid white';
    });

    marker.addEventListener('mouseleave', () => {
      marker.style.transform = 'scale(1)';
      marker.style.zIndex = '10';
      marker.style.boxShadow = `
        0 2px 8px rgba(0,0,0,0.3),
        0 0 0 2px rgba(255,255,255,0.8) inset
      `;
      marker.style.outline = 'none';
    });

    // Add the marker to the wrapper
    wrapper.appendChild(marker);

    return wrapper;
  }

  private createGeoJSON(points: HeatmapDataPoint[]): GeoJSON.FeatureCollection {
    // Use this.data to ensure the method uses 'this'
    const dataPoints = points.length > 0 ? points : this.data;
    
    return {
      type: 'FeatureCollection',
      features: dataPoints.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude]
        },
        properties: {
          municipality: point.municipality,
          severity: point.severity,
          intensity: point.intensity,
          issues_count: point.issues_count,
          affected_populations: point.affected_populations
        }
      }))
    };
  }

  private updateMapData(data: HeatmapDataPoint[]) {
    if (!this.map) return;

    // Update heatmap data
    const source = this.map.getSource('service-gaps') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(this.createGeoJSON(data));
    }

    // Remove existing markers properly
    const markers = document.querySelectorAll('.municipality-marker');
    markers.forEach(marker => {
      // Remove the marker element and its associated Mapbox marker
      const parent = marker.parentElement;
      if (parent && parent.classList.contains('mapboxgl-marker')) {
        parent.remove();
      } else {
        marker.remove();
      }
    });

    // Add new markers
    data.forEach(point => {
      const markerElement = this.createMarkerElement(point);

      new mapboxgl.Marker({ element: markerElement })
        .setLngLat([point.longitude, point.latitude])
        .addTo(this.map!);

      // Add click handler
      markerElement.addEventListener('click', () => {
        this.onMunicipalityClick?.(point);
      });
    });
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
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

// Export for use in Astro components
export default ServiceGapHeatmap;
