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
import { formatNumber, handleMouseDown, handleSortClick, handleSort, initializeState } from './utils'; // Import the functions
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
  const [maxValues, setMaxValues] = useState<number[]>([]);
  const [dates, setDates] = useState<string[][]>([]);
  const [tableSettings, setTableSettings] = useState({
    barRounding: 30,
    tableBorderColor: "#A9A9A9",
    alternatingRowColors: true,
    columnWidths: [] as number[],
    tableBorderRadius: 10,
    tableBorderWidth: 2,
    showValueColumns: true,
    showBarCharts: true,
    showLineCharts: true,
    showRowNumbers: false,
    datePart: 'Month'
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [sortModalOpen, setSortModalOpen] = useState<{ open: boolean, index: number | null, top: number | null, left: number | null }>({ open: false, index: null, top: null, left: null });
  const [sortedData, setSortedData] = useState<{ index: number | null, direction: string | null }>({ index: null, direction: null });
  const [hoveredChart, setHoveredChart] = useState<{ data: number[], show: boolean, label: string, column: number | null, cellLeft: number | null, dates: string[] }>({ data: [], show: false, label: '', column: null, cellLeft: null, dates: [] });
  const [persistentChart, setPersistentChart] = useState<{ data: number[], show: boolean, label: string, column: number | null, cellLeft: number | null, dates: string[] }>({ data: [], show: false, label: '', column: null, cellLeft: null, dates: [] });

  const tableRef = useRef<HTMLTableElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setMaxValues, setValueLabel, setTableSettings, setDates);
    console.log("State initialized:", { lists, groupLabels, titles, maxValues, dates });
  }, [data, settings]);

  useEffect(() => {
    console.log("Table settings updated:", tableSettings);
  }, [tableSettings]);

  // Add a new useEffect to handle date part changes
  useEffect(() => {
    if (tableSettings.datePart) {
      // Trigger a refresh or re-fetch of data based on the selected date part
      initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setMaxValues, setValueLabel, setTableSettings, setDates);
      console.log("Date part changed, state re-initialized:", { lists, groupLabels, titles, maxValues, dates });
    }
  }, [tableSettings.datePart]);

  const renderChartCell = (value: number, maxValue: number) => {
    const percentage = (Math.abs(value) / maxValue) * 100;
    const positiveWidth = value > 0 ? percentage : 0;
    const negativeWidth = value < 0 ? percentage : 0;

    return (
      <div className="bar-chart-container">
        {tableSettings.showBarCharts && (
          <>
            <div className="positive-bar">
              <div className="positive-bar-inner" style={{ width: `calc(${positiveWidth}% - 10px)`, borderRadius: `${tableSettings.barRounding}px`, marginLeft: '5px', marginRight: '5px' }}></div>
            </div>
            <div className="negative-bar">
              <div className="negative-bar-inner" style={{ width: `calc(${negativeWidth}% - 10px)`, borderRadius: `${tableSettings.barRounding}px`, marginLeft: '5px', marginRight: '5px' }}></div>
            </div>
          </>
        )}
      </div>
    );
  };    

  const handleResetTable = () => {
    const numberOfLists = Math.min(data.measureHeaders.length, 50);
    const initialLists: number[][][] = Array.from({ length: numberOfLists }, (_, i) =>
      data.data.map(row => [Number(row[i + 1]?.value || 0)])
    );
    setLists(initialLists.map(list => list.map(subList => subList.slice(0, 50))));
    const initialColumnWidths = [150, ...Array(numberOfLists * 3).fill(100)];
    setTableSettings({ ...tableSettings, columnWidths: initialColumnWidths });
    setIsModalOpen(false);
  };

  const handleTableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (
      !(e.target as Element).closest('.chart-cell') &&
      !(e.target as Element).closest('.sort-cell') &&
      !(e.target as Element).closest('th')
    ) {
      setIsModalOpen(true);
    }
  };

  const handleSparklineHover = (list: number[], dates: string[], column: number, label: string, cellLeft: number) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => {
      setHoveredChart({ data: list, show: true, label, column, cellLeft, dates });
    }, 1000);
  };

  const handleSparklineMove = (list: number[], dates: string[], column: number, label: string, cellLeft: number) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredChart({ data: list, show: true, label, column, cellLeft, dates });
  };

  const handleSparklineLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredChart({ data: [], show: false, label: '', column: null, cellLeft: null, dates: [] });
  };

  const handleSparklineRightClick = (e: React.MouseEvent, list: number[], dates: string[], label: string, cellLeft: number) => {
    e.preventDefault();
    setPersistentChart({ data: list, show: true, label, column: null, cellLeft, dates });
  };

  const handleCloseChart = () => {
    setPersistentChart({ data: [], show: false, label: '', column: null, cellLeft: null, dates: [] });
  };

  const handleDatePartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTableSettings({ ...tableSettings, datePart: e.target.value });
  };

  return (
    <div className="advanced-table" style={{ borderColor: tableSettings.tableBorderColor, borderRadius: `${tableSettings.tableBorderRadius}px`, borderWidth: `${tableSettings.tableBorderWidth}px`, border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}` }}>
      <ModalComponent
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleResetTable}
      />
      {sortModalOpen.open && (
        <div className="sort-modal" style={{ top: sortModalOpen.top || 0, left: sortModalOpen.left || 0 }} onClick={() => setSortModalOpen({ open: false, index: null, top: null, left: null })}>
          <div onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleSort('asc', sortModalOpen, lists, groupLabels, setGroupLabels, setLists, setSortedData, setSortModalOpen)}>Low {'>'} High</button>
            <button onClick={() => handleSort('desc', sortModalOpen, lists, groupLabels, setGroupLabels, setLists, setSortedData, setSortModalOpen)}>High {'>'} Low</button>
            <button onClick={() => handleSort('og', sortModalOpen, lists, groupLabels, setGroupLabels, setLists, setSortedData, setSortModalOpen)}>Revert to OG</button>
          </div>
        </div>
      )}
      {hoveredChart.cellLeft !== null && (
        <div className="chart-popup" style={{ left: `${hoveredChart.cellLeft - 610}px`, maxWidth: '600px', height: '300px', width: '90%' }}>
          <Line
            data={{
              labels: hoveredChart.dates.map(date => date.split(' ')[0]),
              datasets: [{
                label: hoveredChart.label,
                data: hoveredChart.data,
                borderColor: 'blue',
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
                },
                zoom: {
                  pan: {
                    enabled: true,
                    mode: 'x'
                  },
                  zoom: {
                    wheel: {
                      enabled: true,
                    },
                    pinch: {
                      enabled: true
                    },
                    mode: 'x',
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
      {persistentChart.show && persistentChart.cellLeft !== null && (
        <div className="chart-popup" style={{ left: `${persistentChart.cellLeft - 610}px`, maxWidth: '600px', height: '300px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={handleCloseChart}>Close</button>
          <Line
            data={{
              labels: persistentChart.dates.map(date => date.split(' ')[0]),
              datasets: [{
                label: persistentChart.label,
                data: persistentChart.data,
                borderColor: 'blue',
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
                },
                zoom: {
                  pan: {
                    enabled: true,
                    mode: 'x'
                  },
                  zoom: {
                    wheel: {
                      enabled: true,
                    },
                    pinch: {
                      enabled: true
                    },
                    mode: 'x',
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
          style={{ borderColor: tableSettings.tableBorderColor, borderRadius: `${tableSettings.tableBorderRadius}px`, borderWidth: `${tableSettings.tableBorderWidth}px` }}
        >
          <thead>
            <tr>
              {tableSettings.showRowNumbers && (
                <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: '50px', position: 'relative' }}>
                  #
                </th>
              )}
              <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[0]}px`, position: 'relative' }}
                onContextMenu={(e) => handleSortClick(e, 0, sortModalOpen, setSortModalOpen)}>
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
                    <th style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 1]}px`, position: 'relative', color: (sortedData.index === index * 3 + 1) ? 'green' : 'inherit' }}
                      onContextMenu={(e) => handleSortClick(e, index * 3 + 1, sortModalOpen, setSortModalOpen)}>
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
                      {title} Chart
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
                    <th className="chart-cell" style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 3]}px`, position: 'relative' }}>
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
                        <div className="chart-container">
                          {renderChartCell(values.reduce((a, b) => a + b, 0), maxValues[colIndex])}
                        </div>
                      </td>
                    )}
                    {tableSettings.showLineCharts && (
                      <td className="chart-cell" style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 3]}px` }}
                          onMouseEnter={(e) => handleSparklineHover(values, dates[rowIndex], colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left)}
                          onMouseMove={(e) => handleSparklineMove(values, dates[rowIndex], colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left)}
                          onMouseLeave={handleSparklineLeave}
                          onContextMenu={(e) => handleSparklineRightClick(e, values, dates[rowIndex], `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left)}>
                        <Sparklines data={values} limit={100} width={tableSettings.columnWidths[colIndex * 3 + 3] - 20} height={20}>
                          <SparklinesLine style={{ stroke: "blue", fill: "none" }} />
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
