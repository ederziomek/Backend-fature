import { ChartConfiguration, ChartType as ChartJSType } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { analyticsConfig } from '@/config';
import { ChartData, ChartType, ChartConfig } from '@/types';

export interface ChartDataPoint {
  x: string | number;
  y: number;
}

export interface PieChartDataPoint {
  label: string;
  value: number;
}

export interface BarChartDataPoint {
  label: string;
  value: number;
}

export interface LineChartOptions {
  title: string;
  data: ChartDataPoint[];
  xLabel: string;
  yLabel: string;
  color: string;
  backgroundColor?: string;
}

export interface BarChartOptions {
  title: string;
  data: BarChartDataPoint[];
  xLabel: string;
  yLabel: string;
  color: string;
  backgroundColor?: string;
}

export interface PieChartOptions {
  title: string;
  data: PieChartDataPoint[];
  colors: string[];
}

export class ChartService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor() {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: analyticsConfig.charts.defaultWidth,
      height: analyticsConfig.charts.defaultHeight,
      backgroundColour: analyticsConfig.charts.backgroundColor,
      chartCallback: (ChartJS) => {
        // Register any additional Chart.js plugins here
        ChartJS.defaults.font.family = analyticsConfig.charts.fontFamily;
        ChartJS.defaults.font.size = analyticsConfig.charts.fontSize;
      }
    });
  }

  /**
   * Generate a line chart
   */
  async generateLineChart(options: LineChartOptions): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels: options.data.map(point => point.x.toString()),
        datasets: [{
          label: options.title,
          data: options.data.map(point => point.y),
          borderColor: options.color,
          backgroundColor: options.backgroundColor || this.hexToRgba(options.color, 0.1),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: options.color,
          pointBorderColor: options.color,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: options.title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: options.xLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: options.yLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            },
            beginAtZero: true
          }
        },
        elements: {
          point: {
            hoverBackgroundColor: options.color
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.LINE,
      title: options.title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate a bar chart
   */
  async generateBarChart(options: BarChartOptions): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: options.data.map(point => point.label),
        datasets: [{
          label: options.title,
          data: options.data.map(point => point.value),
          backgroundColor: options.backgroundColor || this.hexToRgba(options.color, 0.8),
          borderColor: options.color,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: options.title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: options.xLabel
            },
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: options.yLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            },
            beginAtZero: true
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.BAR,
      title: options.title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate a pie chart
   */
  async generatePieChart(options: PieChartOptions): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: options.data.map(point => point.label),
        datasets: [{
          data: options.data.map(point => point.value),
          backgroundColor: options.colors.slice(0, options.data.length),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: options.title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.PIE,
      title: options.title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate a doughnut chart
   */
  async generateDoughnutChart(options: PieChartOptions): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: options.data.map(point => point.label),
        datasets: [{
          data: options.data.map(point => point.value),
          backgroundColor: options.colors.slice(0, options.data.length),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 3,
          cutout: '60%'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: options.title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.DOUGHNUT,
      title: options.title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate an area chart
   */
  async generateAreaChart(options: LineChartOptions): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels: options.data.map(point => point.x.toString()),
        datasets: [{
          label: options.title,
          data: options.data.map(point => point.y),
          borderColor: options.color,
          backgroundColor: options.backgroundColor || this.hexToRgba(options.color, 0.3),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: options.color,
          pointBorderColor: options.color,
          pointRadius: 0,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: options.title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: options.xLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: options.yLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            },
            beginAtZero: true
          }
        },
        elements: {
          point: {
            hoverBackgroundColor: options.color
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.AREA,
      title: options.title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate a multi-line chart
   */
  async generateMultiLineChart(
    title: string,
    datasets: Array<{
      label: string;
      data: ChartDataPoint[];
      color: string;
    }>,
    xLabel: string,
    yLabel: string
  ): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels: datasets[0]?.data.map(point => point.x.toString()) || [],
        datasets: datasets.map(dataset => ({
          label: dataset.label,
          data: dataset.data.map(point => point.y),
          borderColor: dataset.color,
          backgroundColor: this.hexToRgba(dataset.color, 0.1),
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: dataset.color,
          pointBorderColor: dataset.color,
          pointRadius: 4,
          pointHoverRadius: 6
        }))
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: xLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: yLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            },
            beginAtZero: true
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.LINE,
      title: title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate a heatmap-style chart (using scatter plot)
   */
  async generateHeatmapChart(
    title: string,
    data: Array<{ x: number; y: number; value: number }>,
    xLabel: string,
    yLabel: string
  ): Promise<ChartData> {
    const configuration: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [{
          label: title,
          data: data.map(point => ({
            x: point.x,
            y: point.y
          })),
          backgroundColor: data.map(point => {
            // Color intensity based on value
            const intensity = Math.min(point.value / Math.max(...data.map(d => d.value)), 1);
            return this.hexToRgba('#e74c3c', intensity);
          }),
          borderColor: '#c0392b',
          borderWidth: 1,
          pointRadius: data.map(point => {
            // Size based on value
            const maxValue = Math.max(...data.map(d => d.value));
            return Math.max(3, (point.value / maxValue) * 15);
          })
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: xLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: yLabel
            },
            grid: {
              display: true,
              color: 'rgba(0,0,0,0.1)'
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: ChartType.HEATMAP,
      title: title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  /**
   * Generate a custom chart with specific configuration
   */
  async generateCustomChart(
    configuration: ChartConfiguration,
    title: string,
    chartType: ChartType
  ): Promise<ChartData> {
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    const base64Image = imageBuffer.toString('base64');

    return {
      type: chartType,
      title: title,
      data: base64Image,
      config: {
        width: analyticsConfig.charts.defaultWidth,
        height: analyticsConfig.charts.defaultHeight,
        backgroundColor: analyticsConfig.charts.backgroundColor,
        fontFamily: analyticsConfig.charts.fontFamily,
        fontSize: analyticsConfig.charts.fontSize
      }
    };
  }

  // Utility methods

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Get chart colors from configuration
   */
  getChartColors(count: number): string[] {
    const colors = analyticsConfig.charts.colors;
    const result: string[] = [];
    
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    
    return result;
  }

  /**
   * Create chart configuration for dashboard widgets
   */
  createDashboardChartConfig(
    type: ChartType,
    data: any,
    options: any = {}
  ): ChartConfiguration {
    const baseConfig: ChartConfiguration = {
      type: type.toLowerCase() as ChartJSType,
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: options.showLegend !== false,
            position: options.legendPosition || 'top'
          },
          title: {
            display: !!options.title,
            text: options.title
          }
        },
        scales: type === ChartType.PIE || type === ChartType.DOUGHNUT ? undefined : {
          x: {
            grid: {
              display: options.showGrid !== false
            }
          },
          y: {
            grid: {
              display: options.showGrid !== false
            },
            beginAtZero: true
          }
        }
      }
    };

    return baseConfig;
  }
}

