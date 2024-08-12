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

interface HandleMouseDownProps {
  e: React.MouseEvent;
  index: number;
  startWidth: number;
  columnWidths: number[];
  setTableSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const handleMouseDown = ({
  e,
  index,
  startWidth,
  columnWidths,
  setTableSettings
}: HandleMouseDownProps) => {
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

export const initializeState = (
  data: ResponseData,
  settings: any,
  setColumnLabel: React.Dispatch<React.SetStateAction<string>>,
  setGroupLabels: React.Dispatch<React.SetStateAction<(string | number)[]>>,
  setLists: React.Dispatch<React.SetStateAction<number[][][]>>,
  setTitles: React.Dispatch<React.SetStateAction<string[]>>,
  setValueLabel: React.Dispatch<React.SetStateAction<string>>,
  setTableSettings: React.Dispatch<React.SetStateAction<any>>,
  setDates: React.Dispatch<React.SetStateAction<string[][]>>
) => {
  if (data && data.colHeaders?.[0]?.label) {
    setColumnLabel(data.colHeaders[0].label);
  }

  // Ensure a default date part is selected
  const defaultDatePart = settings?.defaultDatePart || 'Month'; // Set your preferred default

  const stateLabels = Array.from(new Set(data.data.map(row => row[0]?.value)));
  setGroupLabels(stateLabels);

  const numberOfLists = Math.min(data.measureHeaders.length, 50);

  const initialLists: number[][][] = stateLabels.map(state => {
    const filteredRows = data.data.filter(row => row[0]?.value === state);
    return Array.from({ length: numberOfLists }, (_, i) => {
      const values = filteredRows.map(row => Number(row[i + 2]?.value || 0));
      return values.slice(0, 500); // Limit to 500 data points
    });
  });

  const initialDates: string[][] = stateLabels.map(state => {
    const filteredRows = data.data.filter(row => row[0]?.value === state);
    return filteredRows.map(row => row[1]?.value || "").slice(0, 500);
  });

  setLists(initialLists);
  setDates(initialDates);

  const headers = data.measureHeaders.map(header => {
    const parts = header.label.split('.');
    return parts[parts.length - 1] || "Data";
  });
  setTitles(headers.slice(0, 50));

  if (data && data.measureHeaders?.[0]?.label) {
    setValueLabel(data.measureHeaders[0].label);
  }

  if (settings) {
    setTableSettings({
      tableBorderColor: settings.tableBorderColor ?? "#A9A9A9",
      alternatingRowColors: settings.alternatingRowColors ?? true,
      columnWidths: [150, ...Array(numberOfLists * 3).fill(200)], // Adjusted for new bar chart columns with 200px width
      tableBorderRadius: settings.tableBorderRadius ?? 0,
      showValueColumns: settings.showValueColumns ?? true,
      showLineCharts: settings.showLineCharts ?? true,
      showBarCharts: settings.showBarCharts ?? true, // Ensure bar charts are shown
      showRowNumbers: settings.showRowNumbers ?? false,
      tableBorderWidth: settings.tableBorderWidth ?? 2, // Ensure to set the default border width
      datePart: defaultDatePart, // Add the default date part here
      positiveBarColor: settings.positiveBarColor ?? '#62BB9A', // Default green
      negativeBarColor: settings.negativeBarColor ?? '#FF0000', // Default red
      barCornerRounding: settings.barCornerRounding ?? 10, // Default rounding
      sparklineColor: settings.sparklineColor ?? 'blue' // Default sparkline color
    });
  }
};

export const getMaxValueInColumn = (lists: number[][][], colIndex: number): number => {
  return Math.max(...lists.map(row => Math.max(...row[colIndex])));
};
