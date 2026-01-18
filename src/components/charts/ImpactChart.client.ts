// Simple chart component for displaying impact metrics
interface ChartData {
  label: string;
  value: number;
  color: string;
  description: string;
}

interface ImpactChartProps {
  data: ChartData[];
  title: string;
  subtitle?: string;
}

class ImpactChart {
  private container: HTMLElement;
  private data: ChartData[];
  private title: string;
  private subtitle?: string;

  constructor(containerId: string, props: ImpactChartProps) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`);
    }

    this.container = container;
    this.data = props.data;
    this.title = props.title;
    this.subtitle = props.subtitle;

    this.render();
  }

  private render() {
    const maxValue = Math.max(...this.data.map(d => d.value));

    this.container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${this.title}</h3>
          ${this.subtitle ? `<p class="text-sm text-gray-600 dark:text-gray-400">${this.subtitle}</p>` : ''}
        </div>

        <div class="space-y-4">
          ${this.data.map((item, index) => `
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <div class="w-4 h-4 rounded-full" style="background-color: ${item.color}"></div>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">${item.label}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">${item.value.toLocaleString()}</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-500 ease-out"
                    style="width: ${(item.value / maxValue) * 100}%; background-color: ${item.color}"
                  ></div>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${item.description}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-blue-900 dark:text-blue-100">Impact Analysis</p>
              <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Solutions are ranked by potential reach and effectiveness in addressing accessibility barriers for Canadian citizens.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateData(newData: ChartData[]) {
    this.data = newData;
    this.render();
  }
}

export default ImpactChart;
