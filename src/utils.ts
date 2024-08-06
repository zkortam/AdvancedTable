import { ResponseData } from '@incorta-org/component-sdk';
import React from 'react';

export const formatNumber = (num: number): string => {
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

export const handleMouseDown = (
  e: React.MouseEvent,
  index: number,
  startWidth: number,
  columnWidths: number[],
  setTableSettings: React.Dispatch<React.SetStateAction<any>>
) => {
  e.preventDefault();
  const startX = e.clientX;

  const handleMouseMove = (e: MouseEvent) => {
    const newWidth = startWidth + (e.clientX - startX);
    const newColumnWidths = [...columnWidths];
    newColumnWidths[index] = newWidth;
    setTableSettings((prevSettings: any) => ({
      ...prevSettings,
      columnWidths: newColumnWidths
    }));
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

export const handleSortClick = (
  e: React.MouseEvent,
  index: number,
  sortModalOpen: any,
  setSortModalOpen: React.Dispatch<React.SetStateAction<any>>
) => {
  e.preventDefault();
  if (sortModalOpen.index === index) {
    setSortModalOpen({ open: false, index: null, top: null, left: null });
  } else {
    const rect = e.currentTarget.getBoundingClientRect();
    setSortModalOpen({ open: true, index, top: rect.bottom, left: rect.left });
  }
};

export const handleSort = (
  direction: string,
  sortModalOpen: any,
  lists: number[][][],
  groupLabels: (string | number)[],
  setGroupLabels: React.Dispatch<React.SetStateAction<(string | number)[]>>,
  setLists: React.Dispatch<React.SetStateAction<number[][][]>>,
  setSortedData: React.Dispatch<React.SetStateAction<{ index: number | null, direction: string | null }>>,
  setSortModalOpen: React.Dispatch<React.SetStateAction<any>>
) => {
  if (sortModalOpen.index === null) return;

  const index = sortModalOpen.index;
  const newLists = [...lists];

  if (direction === 'og') {
    setSortedData({ index: null, direction: null });
  } else {
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
          ? newLists[listIndex][a][0] - newLists[listIndex][b][0]
          : newLists[listIndex][b][0] - newLists[listIndex][a][0];
      });

      setLists(newLists.map(list => sortedIndices.map(i => list[i])));
      setGroupLabels(sortedIndices.map(i => groupLabels[i]));
    }

    setSortedData({ index, direction });
  }

  setSortModalOpen({ open: false, index: null, top: null, left: null });
};

export const initializeState = (
    data: ResponseData,
    settings: any,
    setColumnLabel: React.Dispatch<React.SetStateAction<string>>,
    setGroupLabels: React.Dispatch<React.SetStateAction<(string | number)[]>>,
    setLists: React.Dispatch<React.SetStateAction<number[][][]>>,
    setTitles: React.Dispatch<React.SetStateAction<string[]>>,
    setMaxValues: React.Dispatch<React.SetStateAction<number[]>>,
    setValueLabel: React.Dispatch<React.SetStateAction<string>>,
    setTableSettings: React.Dispatch<React.SetStateAction<any>>,
    setDates: React.Dispatch<React.SetStateAction<string[][]>>
  ) => {
    if (data && data.colHeaders?.[0]?.label) {
      setColumnLabel(data.colHeaders[0].label);
    }
  
    // Extract unique state labels
    const stateLabels = Array.from(new Set(data.data.map(row => row[0]?.value)));
    setGroupLabels(stateLabels);
  
    const numberOfLists = Math.min(data.measureHeaders.length, 50);
  
    // Initialize lists for each state with time-series data
    const initialLists: number[][][] = stateLabels.map(state => {
      const filteredRows = data.data.filter(row => row[0]?.value === state);
      return Array.from({ length: numberOfLists }, (_, i) => {
        const values = filteredRows.map(row => Number(row[i + 2]?.value || 0));
        return values.slice(0, 500); // Limit to 500 data points
      });
    });
  
    // Initialize dates for each state
    const initialDates: string[][] = stateLabels.map(state => {
      const filteredRows = data.data.filter(row => row[0]?.value === state);
      return filteredRows.map(row => row[1]?.value || "").slice(0, 500);
    });
  
    setLists(initialLists);
    setDates(initialDates);
  
    // Extract titles from measure headers
    const headers = data.measureHeaders.map(header => {
      const parts = header.label.split('.');
      return parts[parts.length - 1] || "Data";
    });
    setTitles(headers.slice(0, 50));
  
    // Calculate max values for each measure column for chart scaling
    const maxValues = initialLists[0].map((_, i) => Math.max(...initialLists.map(row => Math.max(...row[i].map(Math.abs)))));
    setMaxValues(maxValues);
  
    if (data && data.measureHeaders?.[0]?.label) {
      setValueLabel(data.measureHeaders[0].label);
    }
  
    if (settings) {
      setTableSettings({
        barRounding: settings.barRounding ?? 30,
        tableBorderColor: settings.tableBorderColor ?? "#A9A9A9",
        alternatingRowColors: settings.alternatingRowColors ?? true,
        columnWidths: [150, ...Array(numberOfLists * 3).fill(100)],
        tableBorderRadius: settings.tableBorderRadius ?? 0,
        showValueColumns: settings.showValueColumns ?? true,
        showBarCharts: settings.showBarCharts ?? true,
        showLineCharts: settings.showLineCharts ?? true,
        showRowNumbers: settings.showRowNumbers ?? false
      });
    }
  };
  
  
