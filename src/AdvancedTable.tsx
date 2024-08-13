import React, { useEffect, useState, useRef } from 'react';
import {
  AppliedPrompts,
  Context,
  onDrillDownFunction,
  ResponseData,
  TContext
} from '@incorta-org/component-sdk';
import { Line } from 'react-chartjs-2';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import 'chart.js/auto';
import './styles.less';
import { formatNumber, handleMouseDown, initializeState, getMaxValueInColumn, getConditionalColor } from './utils';
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
  const [columnLabel, setColumnLabel] = useState<string>("Group");
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
    barRounding: 10, // Default rounding
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
  const [sortState, setSortState] = useState<{ column: number | null, order: 'asc' | 'desc' | null }>({ column: null, order: null });

  const tableRef = useRef<HTMLTableElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const { initialLists, initialGroupLabels } = initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setValueLabel, setTableSettings, setDates, context);

    // Set the column label for the group column (first column)
    if (data.colHeaders && data.colHeaders[0]?.label) {
      setColumnLabel(data.colHeaders[0].label);
    }
  }, [data, settings]);

  useEffect(() => {
    if (tableSettings.datePart) {
      initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setValueLabel, setTableSettings, setDates, context);
    }
  }, [tableSettings.datePart]);

  const handleResetTable = () => {
    const { initialLists, initialGroupLabels } = initializeState(data, settings, setColumnLabel, setGroupLabels, setLists, setTitles, setValueLabel, setTableSettings, setDates, context);
    setLists(initialLists);
    setGroupLabels(initialGroupLabels);
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

  const handleSort = (column: number) => {
    let newOrder: 'asc' | 'desc' | null = null;
    if (sortState.column === column) {
        if (sortState.order === 'desc') {
            newOrder = 'asc';
        } else if (sortState.order === 'asc') {
            newOrder = null;
        } else {
            newOrder = 'desc';
        }
    } else {
        newOrder = 'desc';
    }

    if (newOrder) {
        if (column === -1) {
            const sortedData = [...lists].map((_, rowIndex) => ({
                groupLabel: groupLabels[rowIndex],
                list: lists[rowIndex],
            }));

            sortedData.sort((a, b) => {
                const aValue = a.groupLabel;
                const bValue = b.groupLabel;

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return newOrder === 'asc' ? aValue - bValue : bValue - aValue;
                } else {
                    const aString = aValue.toString();
                    const bString = bValue.toString();
                    return newOrder === 'asc' ? aString.localeCompare(bString) : bString.localeCompare(aString);
                }
            });

            const sortedGroupLabels = sortedData.map(item => item.groupLabel);
            const sortedLists = sortedData.map(item => item.list);

            setGroupLabels(sortedGroupLabels);
            setLists(sortedLists);
        } else {
            const sortedData = [...lists].map((_, rowIndex) => ({
                groupLabel: groupLabels[rowIndex],
                list: lists[rowIndex],
            }));

            sortedData.sort((a, b) => {
                const aValue = a.list[column]?.[0] ?? 0;
                const bValue = b.list[column]?.[0] ?? 0;
                return newOrder === 'asc' ? aValue - bValue : bValue - aValue;
            });

            const sortedGroupLabels = sortedData.map(item => item.groupLabel);
            const sortedLists = sortedData.map(item => item.list);

            setGroupLabels(sortedGroupLabels);
            setLists(sortedLists);
        }
    } else {
        // Reset only the sort order without altering column widths or other settings
        setSortState({ column: null, order: null });

        // Sort the data back to its original order based on the groupLabels
        const resetData = [...lists].map((_, rowIndex) => ({
            groupLabel: groupLabels[rowIndex],
            list: lists[rowIndex],
        }));

        const originalDataOrder = data.data.map((row) => row[0]?.value);
        
        resetData.sort((a, b) => {
          const aIndex = originalDataOrder.indexOf(a.groupLabel?.toString()); // Convert to string
          const bIndex = originalDataOrder.indexOf(b.groupLabel?.toString()); // Convert to string
          return aIndex - bIndex;
       });
      

        const resetGroupLabels = resetData.map(item => item.groupLabel);
        const resetLists = resetData.map(item => item.list);

        setGroupLabels(resetGroupLabels);
        setLists(resetLists);
    }

    setSortState({ column: newOrder ? column : null, order: newOrder });
};

  const getSortIndicatorColor = (column: number) => {
    if (sortState.column === column) {
      return sortState.order === 'asc' ? 'green' : 'red';
    }
    return 'inherit';
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
                borderRadius: `${tableSettings.barRounding}px` 
              }}></div>
            </div>
            <div style={{ flex: '1', height: '20px', position: 'relative' }}>
              <div style={{ 
                width: `${positiveWidth}%`, 
                height: '20px', 
                backgroundColor: tableSettings.positiveBarColor, 
                position: 'absolute', 
                left: 0, 
                borderRadius: `${tableSettings.barRounding}px` 
              }}></div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderValueCell = (value: number, column: number, rowIndex: number) => {
    const maxValue = getMaxValueInColumn(lists, column);
    const defaultTextColor = '#000000'; // Default text color (black)
    const textColor = getConditionalColor(value, column, context, defaultTextColor);

    return (
        <td
            style={{
                border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`,
                width: `${tableSettings.columnWidths[column * 3 + 1]}px`,
            }}
        >
            <span style={{ color: textColor }}>
                {typeof value === 'number' ? formatNumber(value) : value}
            </span>
        </td>
    );
};

  const renderSparkline = (values: number[], dates: string[], colIndex: number) => {
    // Non-expanded view should use Sparklines
    return (
      <Sparklines data={values} limit={values.length} width={tableSettings.columnWidths[colIndex * 3 + 3] - 30} height={tableSettings.columnWidths[colIndex * 3 + 3] / 8} margin={0}>
        <SparklinesLine style={{ stroke: tableSettings.sparklineColor, fill: "none", strokeWidth: 1.5, strokeLinejoin: "round", strokeLinecap: "round" }} />
      </Sparklines>
    );
  };

  const renderExpandedSparkline = (values: number[], dates: string[], colIndex: number) => {
    // Expanded view should use Line component with zoom functionality
    const data = {
      labels: dates,
      datasets: [
        {
          label: 'Sparkline',
          data: values,
          borderColor: tableSettings.sparklineColor,
          fill: false,
          tension: 0.4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
          },
          ticks: {
            maxTicksLimit: 10, // Limit the number of ticks to avoid cluttering
          },
        },
        y: {
          title: {
            display: true,
            text: 'Value',
          },
          ticks: {
            callback: function (tickValue: string | number) {
              // Ensure tickValue is treated as a number before formatting
              if (typeof tickValue === 'number') {
                return formatNumber(tickValue);
              }
              // If tickValue is not a number, return it as is
              return tickValue;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as 'x' | 'y' | 'xy', // Specify 'x' as one of the allowed types
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as 'x' | 'y' | 'xy', // Specify 'x' as one of the allowed types
          },
        },
      },
      interaction: {
        mode: 'nearest' as 'x' | 'nearest' | 'index' | 'dataset' | 'point' | 'y' | undefined,
        intersect: false,
      },
    };    

    return (
      <Line 
        data={data} 
        options={options}
        width={tableSettings.columnWidths[colIndex * 3 + 3] - 30}
        height={tableSettings.columnWidths[colIndex * 3 + 3] / 8}
      />
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
            left: `${hoveredChart.cellLeft - 540}px`, 
            top: `${hoveredChart.cellTop}px`, 
            maxWidth: '500px', 
            height: '300px', 
            width: '90%' 
          }}
          onMouseEnter={handlePopupEnter}
          onMouseLeave={handlePopupLeave}
        >
          {renderExpandedSparkline(hoveredChart.data, hoveredChart.dates, hoveredChart.column!)}
        </div>
      )}
      {persistentChart.show && persistentChart.cellLeft !== null && persistentChart.cellTop !== null && (
        <div 
          className="chart-popup" 
          style={{ 
            left: `${persistentChart.cellLeft - 540}px`, 
            top: `${persistentChart.cellTop}px`, 
            maxWidth: '500px', 
            height: '300px', 
            width: '90%' 
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handlePopupEnter}
          onMouseLeave={handlePopupLeave}
        >
          <button className="close-button" onClick={handleCloseChart}>Close</button>
          {renderExpandedSparkline(persistentChart.data, persistentChart.dates, persistentChart.column!)}
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
                <th 
                  style={{ 
                    border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, 
                    width: '50px', 
                    position: 'relative',
                    color: getSortIndicatorColor(0)
                  }}
                  onClick={() => handleSort(0)}
                >
                  #
                </th>
              )}
              <th 
                style={{ 
                  border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, 
                  width: `${tableSettings.columnWidths[0]}px`, 
                  position: 'relative',
                  color: getSortIndicatorColor(-1)
                }}
                onClick={() => handleSort(-1)}
              >
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
                    <th 
                      style={{ 
                        border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, 
                        width: `${tableSettings.columnWidths[index * 3 + 1]}px`, 
                        position: 'relative',
                        color: getSortIndicatorColor(index)
                      }}
                      onClick={() => handleSort(index)}
                    >
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
                    <th 
                      style={{ 
                        border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, 
                        width: `${tableSettings.columnWidths[index * 3 + 2]}px`, 
                        position: 'relative',
                        color: getSortIndicatorColor(index)
                      }}
                      onClick={() => handleSort(index)}
                    >
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
                    <th 
                      className="chart-cell" 
                      style={{ 
                        border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, 
                        width: `${tableSettings.columnWidths[index * 3 + 3]}px`, 
                        position: 'relative', 
                        padding: '15px',
                        color: getSortIndicatorColor(index)
                      }}
                      onClick={() => handleSort(index)}
                    >
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
                      renderValueCell(values[0], colIndex, rowIndex)
                    )}
                    {tableSettings.showBarCharts && (
                      <td style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 2]}px`, position: 'relative' }}>
                        {renderChartCell(values[0], getMaxValueInColumn(lists, colIndex))}
                      </td>
                    )}
                    {tableSettings.showLineCharts && (
                      <td 
                        className="chart-cell" 
                        style={{ border: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[colIndex * 3 + 3]}px`, padding: '0 15px' }}
                        onMouseEnter={(e) => handleSparklineHover(values, dates[rowIndex], colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left, e.currentTarget.getBoundingClientRect().top)}
                        onMouseMove={(e) => handleSparklineMove(values, dates[rowIndex], colIndex, `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left, e.currentTarget.getBoundingClientRect().top)}
                        onMouseLeave={handleSparklineLeave}
                        onContextMenu={(e) => handleSparklineRightClick(e, values, dates[rowIndex], `${groupLabels[rowIndex]} ${titles[colIndex]}`, e.currentTarget.getBoundingClientRect().left, e.currentTarget.getBoundingClientRect().top)}
                      >
                        {renderSparkline(values, dates[rowIndex], colIndex)}
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
