import React, { useEffect, useState, useRef } from 'react';
import {
  AppliedPrompts,
  Context,
  onDrillDownFunction,
  ResponseData,
  TContext
} from '@incorta-org/component-sdk';
import { Sparklines, SparklinesLine } from 'react-sparklines';

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
  const [groupLabels, setGroupLabels] = useState<string[]>([]);
  const [columnLabel, setColumnLabel] = useState<string>("");
  const [valueLabel, setValueLabel] = useState<string>("");
  const [maxValues, setMaxValues] = useState<number[]>([]);
  const [barRounding, setBarRounding] = useState<number>(30);
  const [tableBorderColor, setTableBorderColor] = useState<string>("#A9A9A9");
  const [alternatingRowColors, setAlternatingRowColors] = useState<boolean>(false);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [tableBorderRadius, setTableBorderRadius] = useState<number>(0);
  const [sortModalOpen, setSortModalOpen] = useState<{ open: boolean, index: number | null }>({ open: false, index: null });
  const [sortedData, setSortedData] = useState<{ index: number | null, direction: string | null }>({ index: null, direction: null });

  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (data && data.colHeaders?.[0]?.label) {
      setColumnLabel(data.colHeaders[0].label);
    }

    const dimensionLabels = data.data.map(row => row[0]?.value || "");
    setGroupLabels(dimensionLabels);

    const numberOfLists = Math.min(data.measureHeaders.length, 50);
    const initialLists: number[][] = Array.from({ length: numberOfLists }, (_, i) =>
      data.data.map(row => Number(row[i + 1]?.value || 0))
    );

    setLists(initialLists.map(list => list.slice(0, 50)));

    const headers = data.measureHeaders.map(header => {
      const parts = header.label.split('.');
      return parts[parts.length - 1] || "Data";
    });
    setTitles(headers.slice(0, 50));

    const maxValues = initialLists.map(list => Math.max(...list.map(Math.abs)));
    setMaxValues(maxValues);

    if (data && data.measureHeaders?.[0]?.label) {
      setValueLabel(data.measureHeaders[0].label);
    }

    if (settings) {
      if (settings.barRounding !== undefined) {
        setBarRounding(settings.barRounding);
      }
      if (settings.tableBorderColor) {
        setTableBorderColor(settings.tableBorderColor);
      }
      if (settings.alternatingRowColors !== undefined) {
        setAlternatingRowColors(settings.alternatingRowColors);
      }
      if (settings.tableBorderRadius !== undefined) {
        setTableBorderRadius(settings.tableBorderRadius);
      }
    }

    const initialColumnWidths = [150, ...Array(numberOfLists * 3).fill(100)];
    setColumnWidths(initialColumnWidths);
  }, [data, settings]);

  const formatNumber = (num: number): string => {
    const absNum = Math.abs(num);
    let formattedNum;

    if (absNum >= 1e9) {
      formattedNum = (num / 1e9).toFixed(2) + 'B';
    } else if (absNum >= 1e6) {
      formattedNum = (num / 1e6).toFixed(2) + 'M';
    } else if (absNum >= 1e3) {
      formattedNum = (num / 1e3).toFixed(2) + 'K';
    } else {
      formattedNum = num.toFixed(2);
    }

    return formattedNum.replace(/(\.0+|0+)$/, ''); // Remove unnecessary trailing zeros
  };

  const renderChartCell = (value: number, maxValue: number) => {
    const percentage = (Math.abs(value) / maxValue) * 100;
    const positiveWidth = value > 0 ? percentage : 0;
    const negativeWidth = value < 0 ? percentage : 0;

    return (
      <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: '1', height: '20px', position: 'relative' }}>
          <div style={{ width: `${negativeWidth}%`, height: '20px', backgroundColor: 'red', position: 'absolute', right: 0, borderRadius: `${barRounding}px` }}></div>
        </div>
        <div style={{ flex: '1', height: '20px', position: 'relative' }}>
          <div style={{ width: `${positiveWidth}%`, height: '20px', backgroundColor: 'green', position: 'absolute', left: 0, borderRadius: `${barRounding}px` }}></div>
        </div>
      </div>
    );
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[index];

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      const newColumnWidths = [...columnWidths];
      newColumnWidths[index] = newWidth;
      setColumnWidths(newColumnWidths);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetTable = () => {
    const numberOfLists = Math.min(data.measureHeaders.length, 50);
    const initialLists: number[][] = Array.from({ length: numberOfLists }, (_, i) =>
      data.data.map(row => Number(row[i + 1]?.value || 0))
    );
    setLists(initialLists.map(list => list.slice(0, 50)));
    const initialColumnWidths = [150, ...Array(numberOfLists * 3).fill(100)];
    setColumnWidths(initialColumnWidths);
    setIsModalOpen(false);
  };

  const handleTableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleSortClick = (index: number) => {
    setSortModalOpen({ open: true, index });
  };

  const handleSort = (direction: string) => {
    if (sortModalOpen.index === null) return;

    const index = sortModalOpen.index;
    const newLists = [...lists];

    if (index === 0) {
      // Sorting for the first column (groupLabels)
      const sortedIndices: number[] = [];
      for (let i = 0; i < groupLabels.length; i++) {
        sortedIndices.push(i);
      }
      sortedIndices.sort((a, b) => {
        if (typeof groupLabels[a] === 'number' && typeof groupLabels[b] === 'number') {
          return direction === 'asc' ? groupLabels[a] - groupLabels[b] : groupLabels[b] - groupLabels[a];
        } else {
          return direction === 'asc'
            ? (groupLabels[a] as string).localeCompare(groupLabels[b] as string)
            : (groupLabels[b] as string).localeCompare(groupLabels[a] as string);
        }
      });

      setGroupLabels(sortedIndices.map(i => groupLabels[i]));
      setLists(lists.map(list => sortedIndices.map(i => list[i])));
    } else {
      // Sorting for value columns
      const listIndex = Math.floor((index - 1) / 3);
      const sortedIndices: number[] = [];
      for (let i = 0; i < newLists[listIndex].length; i++) {
        sortedIndices.push(i);
      }
      sortedIndices.sort((a, b) => {
        return direction === 'asc'
          ? newLists[listIndex][a] - newLists[listIndex][b]
          : newLists[listIndex][b] - newLists[listIndex][a];
      });

      setLists(newLists.map(list => sortedIndices.map(i => list[i])));
      setGroupLabels(sortedIndices.map(i => groupLabels[i]));
    }

    setSortedData({ index, direction });
    setSortModalOpen({ open: false, index: null });
  };

  const extractDataForState = (state: string) => {
    // Assuming the first column is the state, the second column is the timestamp, and the third column is the measure
    const stateData = data.data.filter(row => row[0]?.value === state);
    const timestamps = stateData.map(row => new Date(Number(row[1]?.value || 0))); // Convert to Date
    const profits = stateData.map(row => Number(row[2]?.value || 0)); // Assuming profit is in the third column
    return { timestamps, profits };
  };

  const { timestamps, profits } = extractDataForState('California');

  return (
    <div>
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setIsModalOpen(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '15px',
            textAlign: 'center',
            position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            <p>Would you like to reset the table?</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <button onClick={handleResetTable} style={{
                backgroundColor: 'blue',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '10px 20px',
                marginRight: '10px',
                width: '150px',
                cursor: 'pointer'
              }}>Yes</button>
              <button onClick={() => setIsModalOpen(false)} style={{
                backgroundColor: 'grey',
                color: 'black',
                border: 'none',
                borderRadius: '20px',
                padding: '10px 20px',
                width: '100px',
                cursor: 'pointer'
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {sortModalOpen.open && (
        <div style={{
          position: 'fixed',
          top: `${sortModalOpen.index !== null ? 40 + (sortModalOpen.index * 20) : 0}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '10px',
          boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }} onClick={() => setSortModalOpen({ open: false, index: null })}>
          <div onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleSort('asc')} style={{
              display: 'block',
              backgroundColor: 'lightblue',
              border: 'none',
              borderRadius: '15px',
              padding: '5px 10px',
              marginBottom: '5px',
              cursor: 'pointer'
            }}>Low {'>'} High</button>
            <button onClick={() => handleSort('desc')} style={{
              display: 'block',
              backgroundColor: 'lightblue',
              border: 'none',
              borderRadius: '15px',
              padding: '5px 10px',
              marginBottom: '5px',
              cursor: 'pointer'
            }}>High {'>'} Low</button>
            <button onClick={() => handleSort('og')} style={{
              display: 'block',
              backgroundColor: 'lightblue',
              border: 'none',
              borderRadius: '15px',
              padding: '5px 10px',
              cursor: 'pointer'
            }}>Revert to OG</button>
          </div>
        </div>
      )}
      <div style={{
        overflow: 'hidden',
        borderRadius: `${tableBorderRadius}px`,
        border: `2px solid ${tableBorderColor}`,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <table
          ref={tableRef}
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            borderColor: tableBorderColor
          }}
          onContextMenu={handleTableRightClick}
        >
          <thead>
            <tr>
              <th style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[0]}px`, position: 'relative' }}>
                {columnLabel}
                <button onClick={() => handleSortClick(0)} style={{
                  marginLeft: '5px',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'lightblue',
                  border: 'none',
                  cursor: 'pointer'
                }}>S</button>
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
                  onMouseDown={(e) => handleMouseDown(e, 0)}
                />
              </th>
              {titles.map((title, index) => (
                <React.Fragment key={index}>
                  <th style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[index * 3 + 1]}px`, position: 'relative' }}>
                    {title} Value
                    <button onClick={() => handleSortClick(index * 3 + 1)} style={{
                      marginLeft: '5px',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'lightblue',
                      border: 'none',
                      cursor: 'pointer'
                    }}>S</button>
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
                      onMouseDown={(e) => handleMouseDown(e, index * 3 + 1)}
                    />
                  </th>
                  <th style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[index * 3 + 2]}px`, position: 'relative' }}>
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
                      onMouseDown={(e) => handleMouseDown(e, index * 3 + 2)}
                    />
                  </th>
                  <th style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[index * 3 + 3]}px`, position: 'relative' }}>
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
                      onMouseDown={(e) => handleMouseDown(e, index * 3 + 3)}
                    />
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupLabels.map((label, rowIndex) => (
              <tr key={label} style={{ backgroundColor: alternatingRowColors && rowIndex % 2 === 0 ? 'lightgrey' : 'white' }}>
                <td style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[0]}px` }}>{label}</td>
                {lists.map((list, colIndex) => (
                  <React.Fragment key={colIndex}>
                    <td style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[colIndex * 3 + 1]}px` }}>
                      {formatNumber(list[rowIndex])}
                    </td>
                    <td style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[colIndex * 3 + 2]}px` }}>
                      {renderChartCell(list[rowIndex], maxValues[colIndex])}
                    </td>
                    <td style={{ border: `2px solid ${tableBorderColor}`, width: `${columnWidths[colIndex * 3 + 3]}px` }}>
                      <Sparklines data={list.slice(0, rowIndex + 1)} limit={50} width={100} height={20}>
                        <SparklinesLine style={{ stroke: "blue", fill: "none" }} />
                      </Sparklines>
                    </td>
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
