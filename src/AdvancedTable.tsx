import React, { useEffect, useState } from 'react';
import {
  AppliedPrompts,
  Context,
  onDrillDownFunction,
  ResponseData,
  TContext
} from '@incorta-org/component-sdk';

interface Props {
  context: Context<TContext>;
  prompts: AppliedPrompts;
  data: ResponseData;
  drillDown: onDrillDownFunction;
}

const AdvancedTable = ({ context, prompts, data, drillDown }: Props) => {
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

  useEffect(() => {
    if (data && data.colHeaders && data.colHeaders[0] && data.colHeaders[0].label) {
      setColumnLabel(data.colHeaders[0].label);
    }

    const dimensionLabels = data.data.map(row => row[0].value);
    setGroupLabels(dimensionLabels);

    const numberOfLists = Math.min(data.measureHeaders.length, 50);
    const initialLists: number[][] = Array.from({ length: numberOfLists }, (_, i) =>
      data.data.map(row => Number(row[i + 1].value))
    );

    setLists(initialLists.map(list => list.slice(0, 50)));

    const headers = data.measureHeaders.map(header => {
      const parts = header.label.split('.');
      return parts[parts.length - 1] || "Data";
    });
    setTitles(headers.slice(0, 50));

    const maxValues = initialLists.map(list => Math.max(...list.map(Math.abs)));
    setMaxValues(maxValues);

    if (data && data.measureHeaders && data.measureHeaders[0] && data.measureHeaders[0].label) {
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
    }
  }, [data, settings]);

  const formatNumber = (num: number) => {
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
      <div style={{ width: '200px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100px', height: '20px', position: 'relative' }}>
          <div style={{ width: `${negativeWidth}px`, height: '20px', backgroundColor: 'red', position: 'absolute', right: 0, borderRadius: `${barRounding}px` }}></div>
        </div>
        <div style={{ width: '100px', height: '20px', position: 'relative' }}>
          <div style={{ width: `${positiveWidth}px`, height: '20px', backgroundColor: 'green', position: 'absolute', left: 0, borderRadius: `${barRounding}px` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <table style={{ borderCollapse: 'collapse', width: '100%', borderColor: tableBorderColor }}>
        <thead>
          <tr>
            <th style={{ border: `2px solid ${tableBorderColor}` }}>{columnLabel}</th>
            {titles.map(title => (
              <>
                <th style={{ border: `2px solid ${tableBorderColor}` }} key={`${title}-value`}>{title} Value</th>
                <th style={{ border: `2px solid ${tableBorderColor}` }} key={`${title}-chart`}>{title} Chart</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupLabels.map((label, rowIndex) => (
            <tr key={label} style={{ backgroundColor: alternatingRowColors && rowIndex % 2 === 0 ? 'lightgrey' : 'white' }}>
              <td style={{ border: `2px solid ${tableBorderColor}` }}>{label}</td>
              {lists.map((list, colIndex) => (
                <>
                  <td style={{ border: `2px solid ${tableBorderColor}` }} key={`${label}-${colIndex}-value`}>{formatNumber(list[rowIndex])}</td>
                  <td style={{ border: `2px solid ${tableBorderColor}` }} key={`${label}-${colIndex}-chart`}>{renderChartCell(list[rowIndex], maxValues[colIndex])}</td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdvancedTable;
