import { ResponseData, Context as IncortaContext, TContext as IncortaTContext } from '@incorta-org/component-sdk';
import React from 'react';
import numbro from 'numbro';

const MAX_MANTISSA = 10; // Adjust this value as needed

/**
 * Advanced formatting function using numbro.
 * @param num - The number to format.
 * @param format - A format string (for example: "###,##0.00").
 * @returns A formatted string.
 */
export const formatNumber = (num: number, format?: string): string => {
  // Parse the format string to get formatting options
  const numberFormatOptions = getFormatOptions(format);
  const isCustomRound = true;
  // Set this flag to true if you want to force average formatting; otherwise false.
  const showNumberScale = false; 

  const { 
    decimalPlaces, 
    isThousandsSeparated = false, 
    prefix = '', 
    suffix = '', 
    isPercent = false 
  } = numberFormatOptions ?? {};

  const showAverage = showNumberScale !== false;
  // Use 'any' for numbroOptions since numbro doesn't export an Options type.
  const numbroOptions: any = {
    prefix: prefix,
    postfix: suffix,
    thousandSeparated: isThousandsSeparated,
    output: isPercent ? 'percent' : 'number',
    average: showAverage
  };

  const absNum = Math.abs(num);

  if (decimalPlaces !== undefined) {
    numbroOptions.mantissa = decimalPlaces;
    if (decimalPlaces === 0 && isCustomRound) {
      numbroOptions.trimMantissa = true;
      if (absNum >= 0.1) {
        numbroOptions.mantissa = 2;
      } else if (absNum >= 0.01) {
        numbroOptions.mantissa = 3;
      } else if (absNum >= 0.001) {
        numbroOptions.mantissa = 5;
      } else if (absNum >= 0.0001) {
        numbroOptions.mantissa = 6;
      } else if (absNum >= 0.00001) {
        numbroOptions.mantissa = 7;
      } else if (absNum >= 0.000001) {
        numbroOptions.mantissa = 8;
      }
    }
  }

  // Fix mantissa in case decimalPlaces is undefined and we are showing average values.
  if (decimalPlaces === undefined && showAverage) {
    numbroOptions.mantissa = MAX_MANTISSA;
    numbroOptions.trimMantissa = true;
  }

  // Optionally force average formatting if the number exceeds certain thresholds.
  if (showAverage) {
    const NumberScales = [
      { key: 'trillion', value: 1e12 },
      { key: 'billion', value: 1e9 },
      { key: 'million', value: 1e6 },
      { key: 'thousand', value: 1e3 }
    ];
    for (let i = 0; i < NumberScales.length; i++) {
      if (absNum >= NumberScales[i].value) {
        numbroOptions.forceAverage = NumberScales[i].key;
        break;
      }
    }
  }

  return numbro(num).format(numbroOptions);
};

/**
 * Parses a format string and returns an object with formatting options.
 * @param value - The format string (e.g., "###,##0.00").
 * @returns An object containing formatting options.
 */
export const getFormatOptions = (value?: string) => {
  if (!value) {
    // Fallback to a default format if none is provided.
    value = '###,##0.00';
  }
  // Regular expression to extract parts of the format string.
  const regex = /^('[^']+'|[^0#.%';]*)([#]*,[#]*)?([0#]*\.[0#]*)?(#*%)?('[^']+'|[^0#.%';]*)/g;
  const result = regex.exec(value) || [];
  const [, prefix, thousandsFormat, decimalFormat, percent, suffix] = result;

  let decimalPlaces: number | undefined = 0;
  if (decimalFormat?.length) {
    const match = /\.(0+)/g.exec(decimalFormat);
    decimalPlaces = match ? match[1].length : 0;
  }

  const unwrappedPrefix = prefix.replace(/'/g, '');
  const unwrappedSuffix = suffix.replace(/'/g, '');

  return {
    decimalPlaces,
    isThousandsSeparated: !!thousandsFormat,
    prefix: unwrappedPrefix,
    suffix: unwrappedSuffix,
    isPercent: !!percent
  };
};

interface HandleMouseDownProps {
  e: React.MouseEvent;
  index: number;
  startWidth: number;
  columnWidths: number[];
  setTableSettings: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * Enables column resizing by handling mouse drag events.
 */
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

/**
 * Initializes state based on the incoming data.
 */
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

  // Apply table settings with design defaults (as per the alt design)
  if (settings) {
    setTableSettings({
      tableBorderColor: settings.tableBorderColor ?? "#cfd5da",
      alternatingRowColors: settings.alternatingRowColors ?? false,
      columnWidths: [150, ...Array(numberOfLists * 3).fill(200)],
      tableBorderRadius: settings.tableBorderRadius ?? 0,
      tableBorderWidth: settings.tableBorderWidth ?? 1,
      showValueColumns: settings.showValueColumns ?? true,
      showLineCharts: settings.showLineCharts ?? true,
      showBarCharts: settings.showBarCharts ?? true,
      showRowNumbers: settings.showRowNumbers ?? false,
      datePart: settings?.defaultDatePart || 'Month',
      positiveBarColor: settings.positiveBarColor ?? '#00FF00',
      negativeBarColor: settings.negativeBarColor ?? '#FF0000',
      barRounding: settings.barRounding ?? 10,
      sparklineColor: settings.sparklineColor ?? 'blue',
      // Font settings
      headerFontFamily: settings.headerFontFamily || 'Arial',
      headerFontSize: settings.headerFontSize || 12,
      headerFontWeight: settings.headerFontWeight || 600,
      headerFontColor: settings.headerFontColor || '#21314d',
      cellFontFamily: settings.valueFontFamily || 'Arial',
      cellFontSize: settings.valueFontSize || 12,
      cellFontWeight: settings.cellFontWeight || 400,
      cellFontColor: settings.valueFontColor || '#393e41',
      rowFontColor: '#5f6972'
    });
  }

  return { initialLists, initialGroupLabels: stateLabels };
};

/**
 * Applies conditional formatting to a value based on binding settings.
 */
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

/**
 * Returns the maximum value in a specified column.
 */
export const getMaxValueInColumn = (lists: number[][][], colIndex: number): number => {
  return Math.max(...lists.map(row => Math.max(...row[colIndex])));
};

/**
 * A helper to get the conditional text color based on the value and binding settings.
 */
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
