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

interface Props {
  context: Context<TContext>;
  prompts: AppliedPrompts;
  data: ResponseData;
  drillDown: onDrillDownFunction;
}

const AdvancedTable: React.FC<Props> = ({ context, prompts, data, drillDown }) => {
  const settings = context?.component?.settings;

  const [lists, setLists] = useState<number[][]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [groupLabels, setGroupLabels] = useState<(string | number)[]>([]);
  const [columnLabel, setColumnLabel] = useState<string>("");
  const [valueLabel, setValueLabel] = useState<string>("");
  const [maxValues, setMaxValues] = useState<number[]>([]);
  const [tableSettings, setTableSettings] = useState({
    barRounding: 30,
    tableBorderColor: "#A9A9A9",
    alternatingRowColors: true,
    columnWidths: [] as number[],
    tableBorderRadius: 10, // Ensure this matches the @tableBorderRadius variable in the LESS file
    showValueColumns: true,
    showBarCharts: true,
    showLineCharts: true,
    showRowNumbers: false
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [sortModalOpen, setSortModalOpen] = useState<{ open: boolean, index: number | null, top: number | null, left: number | null }>({ open: false, index: null, top: null, left: null });
  const [sortedData, setSortedData] = useState<{ index: number | null, direction: string | null }>({ index: null, direction: null });
  const [hoveredChart, setHoveredChart] = useState<{ data: number[], show: boolean, label: string, column: number | null, cellLeft: number | null }>({ data: [], show: false, label: '', column: null, cellLeft: null });
  const [persistentChart, setPersistentChart] = useState<{ data: number[], show: boolean, label: string, column: number | null, cellLeft: number | null }>({ data: [], show: false, label: '', column: null, cellLeft: null });

  const tableRef = useRef<HTMLTableElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setMaxValues, setValueLabel, setTableSettings);
  }, [data, settings]);

  const renderChartCell = (value: number, maxValue: number) => {
    const percentage = (Math.abs(value) / maxValue) * 100;
    const positiveWidth = value > 0 ? percentage : 0;
    const negativeWidth = value < 0 ? percentage : 0;

    return (
      <div className="bar-chart">
        {tableSettings.showBarCharts && (
          <>
            <div className="positive-bar">
              <div className="positive-bar-inner" style={{ width: `${positiveWidth}%`, borderRadius: `${tableSettings.barRounding}px` }}></div>
            </div>
            <div className="negative-bar">
              <div className="negative-bar-inner" style={{ width: `${negativeWidth}%`, borderRadius: `${tableSettings.barRounding}px` }}></div>
            </div>
          </>
        )}
      </div>
    );
  };

  const handleResetTable = () => {
    const numberOfLists = Math.min(data.measureHeaders.length, 50);
    const initialLists: number[][] = Array.from({ length: numberOfLists }, (_, i) =>
      data.data.map(row => Number(row[i + 1]?.value || 0))
    );
    setLists(initialLists.map(list => list.slice(0, 50)));
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

  const handleSparklineHover = (list: number[], column: number, label: string, cellLeft: number) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => {
      setHoveredChart({ data: list, show: true, label, column, cellLeft });
    }, 1000);
  };

  const handleSparklineMove = (list: number[], column: number, label: string, cellLeft: number) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredChart({ data: list, show: true, label, column, cellLeft });
  };

  const handleSparklineLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setHoveredChart({ data: [], show: false, label: '', column: null, cellLeft: null });
  };

  const handleSparklineRightClick = (e: React.MouseEvent, list: number[], label: string, cellLeft: number) => {
    e.preventDefault();
    setPersistentChart({ data: list, show: true, label, column: null, cellLeft });
  };

  const handleCloseChart = () => {
    setPersistentChart({ data: [], show: false, label: '', column: null, cellLeft: null });
  };

  const extractDataForState = (state: string | number) => {
    const stateData = data.data.filter(row => row[0]?.value === state);
    const timestamps = stateData.map(row => new Date(Number(row[1]?.value || 0))); // Convert to Date
    const profits = stateData.map(row => Number(row[2]?.value || 0)); // Assuming profit is in the third column
    return { timestamps, profits };
  };

  return (
    <div className="advanced-table" style={{ borderColor: tableSettings.tableBorderColor, borderRadius: `${tableSettings.tableBorderRadius}px`, border: `2px solid ${tableSettings.tableBorderColor}` }}>
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
        <div className="chart-popup" style={{ left: `${hoveredChart.cellLeft - 400 - 50}px` }}>
          <Line
            data={{
              labels: hoveredChart.data.map((_, i) => i + 1),
              datasets: [{
                label: hoveredChart.label,
                data: hoveredChart.data,
                borderColor: 'blue',
                fill: false,
                tension: 0.4, // Smoothens the line
              }]
            }}
            options={{
              responsive: true,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Data Point'
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
                  enabled: true
                }
              }
            }}
          />
        </div>
      )}
      {persistentChart.show && persistentChart.cellLeft !== null && (
        <div className="chart-popup" style={{ left: `${persistentChart.cellLeft - 400 - 50}px` }} onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={handleCloseChart}>Close</button>
          <Line
            data={{
              labels: persistentChart.data.map((_, i) => i + 1),
              datasets: [{
                label: persistentChart.label,
                data: persistentChart.data,
                borderColor: 'blue',
                fill: false,
                tension: 0.4, // Smoothens the line
              }]
            }}
            options={{
              responsive: true,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Data Point'
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
                  enabled: true
                }
              }
            }}
          />
        </div>
      )}
      <div>
        <table
          ref={tableRef}
          onContextMenu={handleTableRightClick}
          style={{ borderColor: tableSettings.tableBorderColor, borderRadius: `${tableSettings.tableBorderRadius}px` }}
        >
          <thead>
            <tr>
              {tableSettings.showRowNumbers && (
                <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: '50px', position: 'relative' }}>
                  #
                </th>
              )}
              <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[0]}px`, position: 'relative' }}
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
                  onMouseDown={(e) => handleMouseDown(e, 0, tableSettings.columnWidths[0], tableSettings.columnWidths, setTableSettings)}
                />
              </th>
              {titles.map((title, index) => (
                <React.Fragment key={index}>
                  {tableSettings.showValueColumns && (
                    <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 1]}px`, position: 'relative', color: (sortedData.index === index * 3 + 1) ? 'green' : 'inherit' }}
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
                        onMouseDown={(e) => handleMouseDown(e, index * 3 + 1, tableSettings.columnWidths[index * 3 + 1], tableSettings.columnWidths, setTableSettings)}
                      />
                    </th>
                  )}
                  {tableSettings.showBarCharts && (
                    <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 2]}px`, position: 'relative' }}>
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
                        onMouseDown={(e) => handleMouseDown(e, index * 3 + 2, tableSettings.columnWidths[index * 3 + 2], tableSettings.columnWidths, setTableSettings)}
                      />
                    </th>
                  )}
                  {tableSettings.showLineCharts && (
                    <th className="chart-cell" style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 3]}px`, position: 'relative' }}
                      onMouseEnter={(e) => handleSparklineHover(lists[index].slice(0, index + 1), index, `${groupLabels[index]} ${titles[index]}`, e.currentTarget.getBoundingClientRect().left)}
                      onMouseMove={(e) => handleSparklineMove(lists[index].slice(0, index + 1), index, `${groupLabels[index]} ${titles[index]}`, e.currentTarget.getBoundingClientRect().left)}
                      onMouseLeave={handleSparklineLeave}
                      onContextMenu={(e) => handleSparklineRightClick(e, lists[index].slice(0, index + 1), `${groupLabels[index]} ${titles[index]}`, e.currentTarget.getBoundingClientRect().left)}>
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
                        onMouseDown={(e) => handleMouseDown(e, index * 3 + 3, tableSettings.columnWidths[index * 3 + 3], tableSettings.columnWidths, setTableSettings)}
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
                  <td style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: '50px' }}>{rowIndex + 1}</td>
                )}
                <td style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[0]}px` }}>{label}</td>
                {lists.map((list, colIndex) => (
                  <React.Fragment key={colIndex}>
                    {tableSettings.showValueColumns && (
                      <td style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 1]}px` }}>
                        {typeof list[rowIndex] === 'number' ? formatNumber(list[rowIndex]) : list[rowIndex]}
                      </td>
                    )}
                    {tableSettings.showBarCharts && (
                      <td style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 2]}px` }}>
                        {renderChartCell(list[rowIndex], maxValues[colIndex])}
                      </td>
                    )}
                    {tableSettings.showLineCharts && (
                      <td className="chart-cell" style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 3]}px` }}
                        onMouseEnter={(e) => handleSparklineHover(list.slice(0, rowIndex + 1), colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left)}
                        onMouseMove={(e) => handleSparklineMove(list.slice(0, rowIndex + 1), colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left)}
                        onMouseLeave={handleSparklineLeave}
                        onContextMenu={(e) => handleSparklineRightClick(e, list.slice(0, rowIndex + 1), `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left)}>
                        <Sparklines data={list.slice(0, rowIndex + 1)} limit={50} width={100} height={20}>
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
