import React, { useEffect, useState, useRef } from 'react';
import {
  AppliedPrompts,
  Context,
  onDrillDownFunction,
  ResponseData,
  TContext
} from '@incorta-org/component-sdk';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './styles.less';
import { formatNumber, handleMouseDown, initializeState, getMaxValueInColumn } from './utils';
import ModalComponent from './ModalComponent';
import { Chart } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

interface Props {
  context: Context<TContext>;
  prompts: AppliedPrompts;
  data: ResponseData;
  drillDown: onDrillDownFunction;
}

const AdvancedTable: React.FC<Props> = ({ context, prompts, data, drillDown }) => {
  const settings = context?.component?.settings;

  const [lists, setLists] = useState<number[][][]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [groupLabels, setGroupLabels] = useState<(string | number)[]>([]);
  const [columnLabel, setColumnLabel] = useState<string>("");
  const [valueLabel, setValueLabel] = useState<string>("");
  const [dates, setDates] = useState<string[][]>([]);
  const [tableSettings, setTableSettings] = useState({
    tableBorderColor: "#A9A9A9",
    alternatingRowColors: true,
    columnWidths: [] as number[],
    tableBorderRadius: 10,
    tableBorderWidth: 2, // Allow 0px for no border
    showValueColumns: true,
    showLineCharts: true,
    showBarCharts: true,
    showRowNumbers: false,
    datePart: 'Month',
    positiveBarColor: '#00FF00', // Default green
    negativeBarColor: '#FF0000', // Default red
    barCornerRounding: 10, // Default rounding
    sparklineColor: 'blue' // Default sparkline color
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [hoveredChart, setHoveredChart] = useState<{ 
    data: number[], 
    show: boolean, 
    label: string, 
    column: number | null, 
    cellLeft: number | null, 
    cellTop: number | null, 
    dates: string[] 
  }>({ data: [], show: false, label: '', column: null, cellLeft: null, cellTop: null, dates: [] });
  const [persistentChart, setPersistentChart] = useState<{ 
    data: number[], 
    show: boolean, 
    label: string, 
    column: number | null, 
    cellLeft: number | null, 
    cellTop: number | null, 
    dates: string[] 
  }>({ data: [], show: false, label: '', column: null, cellLeft: null, cellTop: null, dates: [] });

  const tableRef = useRef<HTMLTableElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setValueLabel, setTableSettings, setDates);
  }, [data, settings]);

  useEffect(() => {
    if (tableSettings.datePart) {
      initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setValueLabel, setTableSettings, setDates);
    }
  }, [tableSettings.datePart]);

  const handleResetTable = () => {
    const numberOfLists = Math.min(data.measureHeaders.length, 50);
    const initialLists: number[][][] = Array.from({ length: numberOfLists }, (_, i) =>
      data.data.map(row => [Number(row[i + 1]?.value || 0)])
    );
    setLists(initialLists.map(list => list.map(subList => subList.slice(0, 50))));
    const initialColumnWidths = [150, ...Array(numberOfLists * 3).fill(200)]; // Adjusted for new bar chart columns with 200px width
    setTableSettings({ ...tableSettings, columnWidths: initialColumnWidths });
    setIsModalOpen(false);
  };

  const handleTableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (
      !(e.target as Element).closest('.chart-cell') &&
      !(e.target as Element).closest('th')
    ) {
      setIsModalOpen(true);
    }
  };

  const handleSparklineHover = (list: number[], dates: string[], column: number, label: string, cellLeft: number, cellTop: number) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => {
      setHoveredChart({ data: list, show: true, label, column, cellLeft, cellTop, dates });
    }, 500);
  };

  const handleSparklineMove = (list: number[], dates: string[], column: number, label: string, cellLeft: number, cellTop: number) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredChart({ data: list, show: true, label, column, cellLeft, cellTop, dates });
  };

  const handleSparklineLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    // Delay closing to allow moving the cursor to the popup
    hoverTimeout.current = setTimeout(() => {
      setHoveredChart({ data: [], show: false, label: '', column: null, cellLeft: null, cellTop: null, dates: [] });
    }, 300);
  };

  const handleSparklineRightClick = (e: React.MouseEvent, list: number[], dates: string[], label: string, cellLeft: number, cellTop: number) => {
    e.preventDefault();
    setPersistentChart({ data: list, show: true, label, column: null, cellLeft, cellTop, dates });
  };

  const handleCloseChart = () => {
    setPersistentChart({ data: [], show: false, label: '', column: null, cellLeft: null, cellTop: null, dates: [] });
  };

  const handlePopupEnter = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
  };

  const handlePopupLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredChart({ data: [], show: false, label: '', column: null, cellLeft: null, cellTop: null, dates: [] });
  };

  const renderChartCell = (value: number, maxValue: number) => {
    const percentage = (Math.abs(value) / maxValue) * 100;
    const positiveWidth = value > 0 ? percentage : 0;
    const negativeWidth = value < 0 ? percentage : 0;

    return (
      <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        {tableSettings.showBarCharts && (
          <>
            <div style={{ flex: '1', height: '20px', position: 'relative' }}>
              <div style={{ 
                width: `${negativeWidth}%`, 
                height: '20px', 
                backgroundColor: tableSettings.negativeBarColor, 
                position: 'absolute', 
                right: 0, 
                borderRadius: `${tableSettings.barCornerRounding}px` 
              }}></div>
            </div>
            <div style={{ flex: '1', height: '20px', position: 'relative' }}>
              <div style={{ 
                width: `${positiveWidth}%`, 
                height: '20px', 
                backgroundColor: tableSettings.positiveBarColor, 
                position: 'absolute', 
                left: 0, 
                borderRadius: `${tableSettings.barCornerRounding}px` 
              }}></div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="advanced-table" style={{ borderColor: tableSettings.tableBorderColor, borderRadius: `${tableSettings.tableBorderRadius}px`, borderWidth: `${tableSettings.tableBorderWidth}px`, border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}` }}>
      <ModalComponent
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleResetTable}
      />
      {hoveredChart.show && hoveredChart.cellLeft !== null && hoveredChart.cellTop !== null && (
        <div 
          className="chart-popup" 
          style={{ 
            left: `${hoveredChart.cellLeft - 640}px`, 
            top: `${hoveredChart.cellTop}px`, 
            maxWidth: '600px', 
            height: '300px', 
            width: '90%' 
          }}
          onMouseEnter={handlePopupEnter}
          onMouseLeave={handlePopupLeave}
        >
          <Line
            data={{
              labels: hoveredChart.dates.map(date => date.split(' ')[0]),
              datasets: [{
                label: hoveredChart.label,
                data: hoveredChart.data,
                borderColor: tableSettings.sparklineColor,
                fill: false,
                tension: 0.4,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Date'
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: 'Value'
                  },
                  ticks: {
                    callback: (value) => formatNumber(value as number)
                  }
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top'
                },
                tooltip: {
                  enabled: true,
                  mode: 'index',
                  intersect: false,
                  position: 'nearest',
                  callbacks: {
                    title: (context) => context[0].label
                  }
                }
              },
              interaction: {
                mode: 'index',
                intersect: false,
              },
            }}
          />
        </div>
      )}
      {persistentChart.show && persistentChart.cellLeft !== null && persistentChart.cellTop !== null && (
        <div 
          className="chart-popup" 
          style={{ 
            left: `${persistentChart.cellLeft - 640}px`, 
            top: `${persistentChart.cellTop}px`, 
            maxWidth: '600px', 
            height: '300px', 
            width: '90%' 
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handlePopupEnter}
          onMouseLeave={handlePopupLeave}
        >
          <button className="close-button" onClick={handleCloseChart}>Close</button>
          <Line
            data={{
              labels: persistentChart.dates.map(date => date.split(' ')[0]),
              datasets: [{
                label: persistentChart.label,
                data: persistentChart.data,
                borderColor: tableSettings.sparklineColor,
                fill: false,
                tension: 0.4,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Date'
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: 'Value'
                  },
                  ticks: {
                    callback: (value) => formatNumber(value as number)
                  }
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top'
                },
                tooltip: {
                  enabled: true,
                  mode: 'index',
                  intersect: false,
                  position: 'nearest',
                  callbacks: {
                    title: (context) => context[0].label
                  }
                }
              },
              interaction: {
                mode: 'index',
                intersect: false,
              },
            }}
          />
        </div>
      )}
      <div>
        <table
          ref={tableRef}
          onContextMenu={handleTableRightClick}
          style={{ borderColor: tableSettings.tableBorderColor, borderRadius: `${tableSettings.tableBorderRadius}px`, borderWidth: `${tableSettings.tableBorderWidth}px`, borderCollapse: 'collapse' }}
        >
          <thead>
            <tr>
              {tableSettings.showRowNumbers && (
                <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: '50px', position: 'relative' }}>
                  #
                </th>
              )}
              <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[0]}px`, position: 'relative' }}>
                {columnLabel}
                <div
                  style={{
                    display: 'inline-block',
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                  onMouseDown={(e) => handleMouseDown({ e, index: 0, startWidth: tableSettings.columnWidths[0], columnWidths: tableSettings.columnWidths, setTableSettings })}
                />
              </th>
              {titles.map((title, index) => (
                <React.Fragment key={index}>
                  {tableSettings.showValueColumns && (
                    <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 1]}px`, position: 'relative' }}>
                      {title} Value
                      <div
                        style={{
                          display: 'inline-block',
                          width: '5px',
                          height: '100%',
                          cursor: 'col-resize',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                        }}
                        onMouseDown={(e) => handleMouseDown({ e, index: index * 3 + 1, startWidth: tableSettings.columnWidths[index * 3 + 1], columnWidths: tableSettings.columnWidths, setTableSettings })}
                      />
                    </th>
                  )}
                  {tableSettings.showBarCharts && (
                    <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 2]}px`, position: 'relative' }}>
                      {title} Bar Chart
                      <div
                        style={{
                          display: 'inline-block',
                          width: '5px',
                          height: '100%',
                          cursor: 'col-resize',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                        }}
                        onMouseDown={(e) => handleMouseDown({ e, index: index * 3 + 2, startWidth: tableSettings.columnWidths[index * 3 + 2], columnWidths: tableSettings.columnWidths, setTableSettings })}
                      />
                    </th>
                  )}
                  {tableSettings.showLineCharts && (
                    <th className="chart-cell" style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 3]}px`, position: 'relative', padding: '15px' }}>
                      {title} Sparkline
                      <div
                        style={{
                          display: 'inline-block',
                          width: '5px',
                          height: '100%',
                          cursor: 'col-resize',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                        }}
                        onMouseDown={(e) => handleMouseDown({ e, index: index * 3 + 3, startWidth: tableSettings.columnWidths[index * 3 + 3], columnWidths: tableSettings.columnWidths, setTableSettings })}
                      />
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupLabels.map((label, rowIndex) => (
              <tr key={label} style={{ backgroundColor: tableSettings.alternatingRowColors && rowIndex % 2 === 0 ? 'lightgrey' : 'white' }}>
                {tableSettings.showRowNumbers && (
                  <td style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: '50px' }}>{rowIndex + 1}</td>
                )}
                <td style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[0]}px` }}>{label}</td>
                {lists[rowIndex].map((values, colIndex) => (
                  <React.Fragment key={colIndex}>
                    {tableSettings.showValueColumns && (
                      <td style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 1]}px` }}>
                        {typeof values[0] === 'number' ? formatNumber(values.reduce((a, b) => a + b, 0)) : values[0]}
                      </td>
                    )}
                    {tableSettings.showBarCharts && (
                      <td style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 2]}px`, position: 'relative' }}>
                        {renderChartCell(values[0], getMaxValueInColumn(lists, colIndex))}
                      </td>
                    )}
                    {tableSettings.showLineCharts && (
                      <td className="chart-cell" style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 3]}px`, padding: '0 15px' }}
                          onMouseEnter={(e) => handleSparklineHover(values, dates[rowIndex], colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left, e.currentTarget.getBoundingClientRect().top)}
                          onMouseMove={(e) => handleSparklineMove(values, dates[rowIndex], colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left, e.currentTarget.getBoundingClientRect().top)}
                          onMouseLeave={handleSparklineLeave}
                          onContextMenu={(e) => handleSparklineRightClick(e, values, dates[rowIndex], `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left, e.currentTarget.getBoundingClientRect().top)}>
                        <Sparklines data={values} limit={values.length} width={tableSettings.columnWidths[colIndex * 3 + 3] - 30} height={tableSettings.columnWidths[colIndex * 3 + 3] / 8} margin={0}>
                          <SparklinesLine style={{ stroke: tableSettings.sparklineColor, fill: "none", strokeWidth: 1.5, strokeLinejoin: "round", strokeLinecap: "round" }} />
                        </Sparklines>
                      </td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvancedTable;
