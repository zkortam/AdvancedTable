import { ResponseData, Context as IncortaContext, TContext as IncortaTContext } from '@incorta-org/component-sdk';
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
  setTableSettings,
}: HandleMouseDownProps) => {
  e.preventDefault();
  const startX = e.clientX;

  const handleMouseMove = (e: MouseEvent) => {
    const newWidth = startWidth + (e.clientX - startX);
    const newColumnWidths = [...columnWidths];
    newColumnWidths[index] = newWidth;
    setTableSettings((prevSettings: any) => ({
      ...prevSettings,
      columnWidths: newColumnWidths,
    }));
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

interface Condition {
  value: string;
  op: string;
  color: string;
}

interface Binding {
  settings: {
    conditions: Condition[];
  };
}

export const initializeState = (
  data: ResponseData,
  settings: any,
  setColumnLabel: React.Dispatch<React.SetStateAction<string>>,
  setGroupLabels: React.Dispatch<React.SetStateAction<(string | number)[]>>,
  setLists: React.Dispatch<React.SetStateAction<number[][][]>>,
  setTitles: React.Dispatch<React.SetStateAction<string[]>>,
  setValueLabel: React.Dispatch<React.SetStateAction<string>>,
  setTableSettings: React.Dispatch<React.SetStateAction<any>>,
  setDates: React.Dispatch<React.SetStateAction<string[][]>>,
  context: IncortaContext<IncortaTContext>
): { initialLists: number[][][], initialGroupLabels: (string | number)[] } => {
  // Extensive logging for `rowHeaders`
  console.log("Full data object:", data);
  console.log("rowHeaders field in data:", data.rowHeaders);

  // Check if `rowHeaders` is an array with at least one item
  if (Array.isArray(data.rowHeaders) && data.rowHeaders.length > 0) {
    console.log("rowHeaders is an array. Accessing the first item...");
    const firstHeader = data.rowHeaders[0]; // Access the first grouping dimension

    if (firstHeader?.label) {
      console.log("Found label in the first rowHeader:", firstHeader.label);
      const groupingLabel = firstHeader.label || "Category"; // Use the label directly
      setColumnLabel(groupingLabel);
    } else {
      console.warn("The first rowHeader does not contain a label. Defaulting to 'Category'.");
      setColumnLabel("Category");
    }
  } else {
    console.error("rowHeaders is not an array or is empty. Defaulting to 'Category'.");
    setColumnLabel("Category");
  }

  // Default behavior for Group Labels
  const stateLabels = Array.from(new Set(data.data.map(row => row[0]?.value)));
  setGroupLabels(stateLabels);

  const numberOfLists = Math.min(data.measureHeaders.length, 50);

  // Process the value columns
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

  // Process value column headers (measure headers)
  const headers = data.measureHeaders.map(header => {
    const parts = header.label.split('.');
    return parts[parts.length - 1] || "Data";
  });
  setTitles(headers.slice(0, 50));

  // Process the value label
  if (data.measureHeaders?.[0]?.label) {
    setValueLabel(data.measureHeaders[0].label);
  }

  // Apply table settings
  if (settings) {
    setTableSettings({
      tableBorderColor: settings.tableBorderColor ?? "#A9A9A9",
      alternatingRowColors: settings.alternatingRowColors ?? false,
      columnWidths: [150, ...Array(numberOfLists * 3).fill(200)],
      tableBorderRadius: settings.tableBorderRadius ?? 0,
      showValueColumns: settings.showValueColumns ?? true,
      showLineCharts: settings.showLineCharts ?? false,
      showBarCharts: settings.showBarCharts ?? false,
      showRowNumbers: settings.showRowNumbers ?? false,
      tableBorderWidth: settings.tableBorderWidth ?? 2,
      datePart: settings?.defaultDatePart || 'Month',
      positiveBarColor: settings.positiveBarColor ?? '#62BB9A',
      negativeBarColor: settings.negativeBarColor ?? '#FF0000',
      barRounding: settings.barRounding ?? 10,
      sparklineColor: settings.sparklineColor ?? 'blue',
      // New font settings
      valueFontFamily: settings.valueFontFamily || 'Arial',
      valueFontSize: settings.valueFontSize || 14, // Default to 14px
      valueFontColor: settings.valueFontColor || '#000000',
      headerFontFamily: settings.headerFontFamily || 'Arial',
      headerFontSize: settings.headerFontSize || 14, // Default to 14px
      headerFontColor: settings.headerFontColor ?? '#000000',
    });
  }

  return { initialLists, initialGroupLabels: stateLabels };
};

export const applyConditionalFormatting = (
  value: number,
  index: number,
  context: IncortaContext<IncortaTContext>,
  defaultColor: string
): string => {
  const binding = context?.component?.bindings?.["tray-key"]?.[index] as unknown as Binding;
  const conditions = binding?.settings?.conditions || [];

  for (const condition of conditions) {
    const threshold = parseFloat(condition.value);
    if (condition.op === '<' && value < threshold) return condition.color;
    if (condition.op === '>' && value > threshold) return condition.color;
    if (condition.op === '=' && value === threshold) return condition.color;
    if (condition.op === '<=' && value <= threshold) return condition.color;
    if (condition.op === '>=' && value >= threshold) return condition.color;
  }

  return defaultColor;
};

export const getMaxValueInColumn = (lists: number[][][], colIndex: number): number => {
  return Math.max(...lists.map(row => Math.max(...row[colIndex])));
};

export const getConditionalColor = (
  value: number,
  index: number,
  context: IncortaContext<IncortaTContext>,
  defaultColor: string
): string => {
  const binding = context?.component?.bindings?.["tray-key"]?.[index] as unknown as Binding;
  const conditions = binding?.settings?.conditions || [];

  for (const condition of conditions) {
    const threshold = parseFloat(condition.value);
    if (condition.op === '<' && value < threshold) return condition.color;
    if (condition.op === '>' && value > threshold) return condition.color;
    if (condition.op === '=' && value === threshold) return condition.color;
    if (condition.op === '<=' && value <= threshold) return condition.color;
    if (condition.op === '>=' && value >= threshold) return condition.color;
  }

  return defaultColor;
};
