// AdvancedTable.tsx
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
  conditionalFormattingDictionary?: any;
}

const AdvancedTable: React.FC<Props> = ({
  context,
  prompts,
  data,
  drillDown,
  conditionalFormattingDictionary
}) => {
  const settings = context?.component?.settings;

  console.log("Conditional Formatting Dictionary:", conditionalFormattingDictionary);

  // Extract an array of measure formats (one for each measure).
  const measureBindings = context?.component?.bindings?.["tray-key"] || [];
  const measureFormats: string[] = measureBindings.map((binding: any) => {
    let format = binding.settings?.format || "###,##0.00";
    if (format.toLowerCase() === "auto") {
      format = "###,##0.00";
    }
    return format.replace(/INHERIT/g, "");
  });
  const [tableSettings, setTableSettings] = useState({
    tableBorderColor: "#cfd5da", // Reference: #cfd5da
    alternatingRowColors: true,  // Use alternating row colors (even: white, odd: light gray)
    columnWidths: [] as number[],
    tableBorderRadius: 10,      
    tableBorderWidth: 0.5,      
    showValueColumns: settings?.showValueColumns ?? true,
    showLineCharts: settings?.showLineCharts ?? true,
    showBarCharts: settings?.showBarCharts ?? true,
    showRowNumbers: settings?.showRowNumbers ?? false,
    datePart: 'Month',
    positiveBarColor: settings?.positiveBarColor ?? '#00FF00', // Reference: #00FF00
    negativeBarColor: settings?.negativeBarColor ?? '#FF0000', // Reference: #FF0000
    barRounding: settings?.barRounding ?? 10,
    sparklineColor: settings?.sparklineColor ?? 'blue',         // Reference: blue
    headerFontFamily: settings?.headerFontFamily || 'Arial',
    headerFontSize: settings?.headerFontSize || 12,              // Reference: 12px default
    headerFontWeight: settings?.headerFontWeight || 600,         // Reference: 600 default
    headerFontColor: settings?.headerFontColor || '#21314d',      // Reference: #21314d
    cellFontFamily: settings?.valueFontFamily || 'Arial',
    cellFontSize: 12,
    cellFontWeight: 400,
    cellFontColor: settings?.valueFontColor || '#393e41',        // Reference: #393e41
    rowFontColor: '#5f6972'                                      // Reference: #5f6972
  });

  const [lists, setLists] = useState<number[][][]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [groupLabels, setGroupLabels] = useState<(string | number)[]>([]);
  const [columnLabel, setColumnLabel] = useState<string>("Group");
  const [valueLabel, setValueLabel] = useState<string>("");
  const [dates, setDates] = useState<string[][]>([]);
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

  // Helper: Determines the formatting for a cell based on its "f" array.
  const getCellFormatting = (rowIndex: number, colIndex: number) => {
    const cellData = data.data[rowIndex][colIndex + 2] as any;
    console.log(`Cell [${rowIndex}, ${colIndex}] data:`, cellData);
    if (cellData && cellData.f && cellData.f.length > 0) {
      const conditionIndex = cellData.f[0];
      console.log(`Cell [${rowIndex}, ${colIndex}] conditional index:`, conditionIndex);
      if (conditionIndex === -1) {
        console.log(`No condition met for cell [${rowIndex}, ${colIndex}]. Using default formatting.`);
        return { color: tableSettings.cellFontColor, backgroundColor: 'transparent' };
      }
      const formattingBindings = conditionalFormattingDictionary?.bindings?.[2] || {};
      const keys = Object.keys(formattingBindings);
      console.log(`Formatting bindings keys for cell [${rowIndex}, ${colIndex}]:`, keys);
      if (keys.length > 0) {
        const measureKey = keys[0];
        console.log(`Using measure key: ${measureKey}`);
        const formattingArray = conditionalFormattingDictionary?.settings?.[measureKey] || [];
        console.log(`Formatting rules for measureKey ${measureKey}:`, formattingArray);
        if (formattingArray.length > conditionIndex) {
          const rule = formattingArray[conditionIndex];
          console.log(`Selected rule for cell [${rowIndex}, ${colIndex}]:`, rule);
          if (rule && rule.settingValue) {
            console.log(`Applying formatting for cell [${rowIndex}, ${colIndex}]:`, rule.settingValue);
            return rule.settingValue;
          } else {
            console.log(`Rule found but no settingValue for cell [${rowIndex}, ${colIndex}].`);
          }
        } else {
          console.log(`No rule found at index ${conditionIndex} for measureKey ${measureKey}.`);
        }
      } else {
        console.log(`No formatting bindings found for cell [${rowIndex}, ${colIndex}].`);
      }
    }
    console.log(`Cell [${rowIndex}, ${colIndex}] does not have conditional formatting. Using default formatting.`);
    return { color: tableSettings.cellFontColor, backgroundColor: 'transparent' };
  };

  useEffect(() => {
    const { initialLists, initialGroupLabels } = initializeState(
      data,
      settings,
      setColumnLabel,
      setGroupLabels,
      setLists,
      setTitles,
      setValueLabel,
      setTableSettings,
      setDates,
      context
    );
    if (data.colHeaders && data.colHeaders[0]?.label) {
      setColumnLabel(data.colHeaders[0].label);
    }
  }, [data, settings]);

  useEffect(() => {
    if (tableSettings.datePart) {
      initializeState(
        data,
        settings,
        setColumnLabel,
        setGroupLabels,
        setLists,
        setTitles,
        setValueLabel,
        setTableSettings,
        setDates,
        context
      );
    }
  }, [tableSettings.datePart]);

  const handleResetTable = () => {
    const { initialLists, initialGroupLabels } = initializeState(
      data,
      settings,
      setColumnLabel,
      setGroupLabels,
      setLists,
      setTitles,
      setValueLabel,
      setTableSettings,
      setDates,
      context
    );
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
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setHoveredChart({ data: list, show: true, label, column, cellLeft, cellTop, dates });
    }, 500);
  };

  const handleSparklineMove = (list: number[], dates: string[], column: number, label: string, cellLeft: number, cellTop: number) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredChart({ data: list, show: true, label, column, cellLeft, cellTop, dates });
  };

  const handleSparklineLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
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
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  const handlePopupLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
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
      setSortState({ column: null, order: null });
      const resetData = [...lists].map((_, rowIndex) => ({
        groupLabel: groupLabels[rowIndex],
        list: lists[rowIndex],
      }));
      const originalDataOrder = data.data.map((row) => row[0]?.value);
      resetData.sort((a, b) => {
        const aIndex = originalDataOrder.indexOf(a.groupLabel?.toString());
        const bIndex = originalDataOrder.indexOf(b.groupLabel?.toString());
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

  const renderValueCell = (values: number[], column: number, rowIndex: number, aggregation: string) => {
    let aggregatedValue = 0;
    switch (aggregation) {
      case 'sum':
        aggregatedValue = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'avg':
        aggregatedValue = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      default:
        aggregatedValue = values[0];
    }
    const cellFormat = measureFormats[column] || "###,##0.00";
    const formatting = getCellFormatting(rowIndex, column);
    return (
      <td
        style={{
          width: `${tableSettings.columnWidths[column * 3 + 1]}px`,
          fontFamily: tableSettings.cellFontFamily,
          fontSize: `${tableSettings.cellFontSize}px`,
          color: formatting.color,
          backgroundColor: formatting.backgroundColor
        }}
      >
        <span>{formatNumber(aggregatedValue, cellFormat)}</span>
      </td>
    );
  };

  const renderSparkline = (rawValues: number[], dates: string[], colIndex: number) => {
    return (
      <Sparklines 
        data={rawValues} 
        limit={rawValues.length} 
        width={tableSettings.columnWidths[colIndex * 3 + 3] - 30} 
        height={tableSettings.columnWidths[colIndex * 3 + 3] / 8} 
        margin={0}
      >
        <SparklinesLine style={{ 
          stroke: tableSettings.sparklineColor, 
          fill: "none", 
          strokeWidth: 1.5, 
          strokeLinejoin: "round", 
          strokeLinecap: "round" 
        }} />
      </Sparklines>
    );
  };

  const renderExpandedSparkline = (values: number[], dates: string[], colIndex: number) => {
    const dataForChart = {
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
            maxTicksLimit: 10,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Value',
          },
          ticks: {
            callback: function (tickValue: string | number) {
              if (typeof tickValue === 'number') {
                return formatNumber(tickValue, measureFormats[colIndex] || "###,##0.00");
              }
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
            mode: 'x' as 'x' | 'y' | 'xy', 
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as 'x' | 'y' | 'xy', 
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
        data={dataForChart} 
        options={options}
        width={tableSettings.columnWidths[colIndex * 3 + 3] - 30}
        height={tableSettings.columnWidths[colIndex * 3 + 3] / 8}
      />
    );
  };

  return (
    // Outer container: only a thin border on the top and bottom, none on left/right.
    <div className="advanced-table" style={{
      borderTop: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`,
      borderBottom: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`,
      borderLeft: 'none',
      borderRight: 'none',
      borderRadius: `${tableSettings.tableBorderRadius}px`
    }}>
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
      {persistentChart.show &&
        persistentChart.cellLeft !== null &&
        persistentChart.cellTop !== null && (
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
            <button className="close-button" onClick={handleCloseChart}>
              Close
            </button>
            {renderExpandedSparkline(
              persistentChart.data,
              persistentChart.dates,
              persistentChart.column!
            )}
          </div>
        )}
      <div>
        <table
          ref={tableRef}
          onContextMenu={handleTableRightClick}
          style={{ borderCollapse: 'collapse' }}
        >
          <thead>
            <tr style={{
              backgroundColor: '#f5f5f5', // Header row background set to light grey
              borderBottom: `${tableSettings.tableBorderWidth}px solid ${tableSettings.tableBorderColor}`
            }}>
              {tableSettings.showRowNumbers && (
                <th
                  style={{
                    width: '50px',
                    position: 'relative',
                    fontFamily: tableSettings.headerFontFamily,
                    fontSize: `${tableSettings.headerFontSize}px`,
                    color: getSortIndicatorColor(0)
                  }}
                  onClick={() => handleSort(0)}
                >
                  #
                </th>
              )}
              <th
                style={{
                  width: `${tableSettings.columnWidths[0]}px`,
                  position: 'relative',
                  fontFamily: tableSettings.headerFontFamily,
                  fontSize: `${tableSettings.headerFontSize}px`,
                  fontWeight: tableSettings.headerFontWeight,
                  color: tableSettings.headerFontColor,
                  cursor: 'pointer'
                }}
                onClick={() => handleSort(-1)}
              >
                {columnLabel}
                {sortState.column === -1 && (
                  <span style={{ marginLeft: '5px' }}>
                    {sortState.order === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                <div
                  style={{
                    display: 'inline-block',
                    width: '2px', // Reduced divider width
                    height: '100%',
                    cursor: 'col-resize',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0
                  }}
                  onMouseDown={(e) =>
                    handleMouseDown({
                      e,
                      index: 0,
                      startWidth: tableSettings.columnWidths[0],
                      columnWidths: tableSettings.columnWidths,
                      setTableSettings
                    })
                  }
                />
              </th>
              {titles.map((title, index) => (
                <React.Fragment key={index}>
                  {tableSettings.showValueColumns && (
                    <th
                      style={{
                        width: `${tableSettings.columnWidths[index * 3 + 1]}px`,
                        position: 'relative',
                        fontFamily: tableSettings.headerFontFamily,
                        fontSize: `${tableSettings.headerFontSize}px`,
                        fontWeight: tableSettings.headerFontWeight,
                        color: tableSettings.headerFontColor,
                        padding: '15px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSort(index)}
                    >
                      {title} Value
                      {sortState.column === index && (
                        <span style={{ marginLeft: '5px' }}>
                          {sortState.order === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                      <div
                        style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '100%',
                          cursor: 'col-resize',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0
                        }}
                        onMouseDown={(e) =>
                          handleMouseDown({
                            e,
                            index: index * 3 + 1,
                            startWidth: tableSettings.columnWidths[index * 3 + 1],
                            columnWidths: tableSettings.columnWidths,
                            setTableSettings
                          })
                        }
                      />
                    </th>
                  )}
                  {tableSettings.showBarCharts && (
                    <th
                      style={{
                        width: `${tableSettings.columnWidths[index * 3 + 2]}px`,
                        position: 'relative',
                        fontFamily: tableSettings.headerFontFamily,
                        fontSize: `${tableSettings.headerFontSize}px`,
                        fontWeight: tableSettings.headerFontWeight,
                        color: tableSettings.headerFontColor,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSort(index)}
                    >
                      {title} Bar Chart
                      {sortState.column === index && (
                        <span style={{ marginLeft: '5px' }}>
                          {sortState.order === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                      <div
                        style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '100%',
                          cursor: 'col-resize',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0
                        }}
                        onMouseDown={(e) =>
                          handleMouseDown({
                            e,
                            index: index * 3 + 2,
                            startWidth: tableSettings.columnWidths[index * 3 + 2],
                            columnWidths: tableSettings.columnWidths,
                            setTableSettings
                          })
                        }
                      />
                    </th>
                  )}
                  {tableSettings.showLineCharts && (
                    <th
                      className="chart-cell"
                      style={{
                        width: `${tableSettings.columnWidths[index * 3 + 3]}px`,
                        position: 'relative',
                        fontFamily: tableSettings.headerFontFamily,
                        fontSize: `${tableSettings.headerFontSize}px`,
                        fontWeight: tableSettings.headerFontWeight,
                        color: tableSettings.headerFontColor,
                        padding: '15px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSort(index)}
                    >
                      {title} Sparkline
                      {sortState.column === index && (
                        <span style={{ marginLeft: '5px' }}>
                          {sortState.order === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                      <div
                        style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '100%',
                          cursor: 'col-resize',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0
                        }}
                        onMouseDown={(e) =>
                          handleMouseDown({
                            e,
                            index: index * 3 + 3,
                            startWidth: tableSettings.columnWidths[index * 3 + 3],
                            columnWidths: tableSettings.columnWidths,
                            setTableSettings
                          })
                        }
                      />
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupLabels.map((label, rowIndex) => (
              <tr key={label} style={{
                backgroundColor: tableSettings.alternatingRowColors 
                  ? (rowIndex % 2 === 0 ? '#ffffff' : '#f5f5f5') 
                  : '#ffffff'
              }}>
                {tableSettings.showRowNumbers && (
                  <td style={{ width: '50px' }}>
                    {rowIndex + 1}
                  </td>
                )}
                <td
                  style={{
                    width: `${tableSettings.columnWidths[0]}px`,
                    fontFamily: tableSettings.cellFontFamily,
                    fontSize: `${tableSettings.cellFontSize}px`,
                    color: tableSettings.rowFontColor
                  }}
                >
                  {label}
                </td>
                {lists[rowIndex].map((values, colIndex) => (
                  <React.Fragment key={colIndex}>
                    {tableSettings.showValueColumns &&
                      renderValueCell(values, colIndex, rowIndex, settings?.aggregationMethod ?? 'sum')}
                    {tableSettings.showBarCharts && (
                      <td
                        style={{
                          width: `${tableSettings.columnWidths[colIndex * 3 + 2]}px`,
                          position: 'relative'
                        }}
                      >
                        {renderChartCell(values[0], getMaxValueInColumn(lists, colIndex))}
                      </td>
                    )}
                    {tableSettings.showLineCharts && (
                      <td
                        className="chart-cell"
                        style={{
                          width: `${tableSettings.columnWidths[colIndex * 3 + 3]}px`,
                          padding: '0 15px'
                        }}
                        onMouseEnter={(e) =>
                          handleSparklineHover(
                            values,
                            dates[rowIndex],
                            colIndex,
                            `${groupLabels[rowIndex]} ${titles[colIndex]}`,
                            e.currentTarget.getBoundingClientRect().left,
                            e.currentTarget.getBoundingClientRect().top
                          )
                        }
                        onMouseMove={(e) =>
                          handleSparklineMove(
                            values,
                            dates[rowIndex],
                            colIndex,
                            `${groupLabels[rowIndex]} ${titles[colIndex]}`,
                            e.currentTarget.getBoundingClientRect().left,
                            e.currentTarget.getBoundingClientRect().top
                          )
                        }
                        onMouseLeave={handleSparklineLeave}
                        onContextMenu={(e) =>
                          handleSparklineRightClick(
                            e,
                            values,
                            dates[rowIndex],
                            `${groupLabels[rowIndex]} ${titles[colIndex]}`,
                            e.currentTarget.getBoundingClientRect().left,
                            e.currentTarget.getBoundingClientRect().top
                          )
                        }
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
