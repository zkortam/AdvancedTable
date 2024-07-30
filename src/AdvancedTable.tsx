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
  }, [data]);

  const getBarWidth = (value: number, maxValue: number) => {
    return (Math.abs(value) / maxValue) * 100;
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #ddd', padding: '10px' }}>
      {/* Column Labels */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
        <div style={{ minWidth: '150px', fontSize: '16px', color: '#000000', textAlign: 'left', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {columnLabel}
        </div>
        {titles.map((title, index) => (
          <div key={index} style={{ width: '300px', textAlign: 'center', borderRight: '1px solid #ddd' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {title}
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '100px', fontSize: '14px', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Value
              </div>
              <div style={{ width: '200px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Chart
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Data Rows */}
      {groupLabels.map((groupLabel, indexGroup) => (
        <div key={indexGroup} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
          <div style={{ minWidth: '150px', fontWeight: 'bold', fontSize: '16px', color: '#000000', textAlign: 'left', borderRight: '1px solid #ddd', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
            {groupLabel}
          </div>
          {lists.map((list, listIndex) => {
            if (indexGroup >= list.length) return null;
            const value = list[indexGroup];
            const width = getBarWidth(value, maxValues[listIndex]);
            const formattedValue = formatNumber(value);
            return (
              <React.Fragment key={`${listIndex}-${indexGroup}`}>
                <div style={{
                  width: '100px',
                  fontSize: '14px',
                  color: '#000000',
                  textAlign: 'right',
                  borderRight: '1px solid #ddd',
                  paddingRight: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {formattedValue}
                </div>
                <div style={{
                  width: '200px',
                  height: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  position: 'relative',
                  borderRight: '1px solid #ddd',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: `${width}px`,
                    height: '20px',
                    backgroundColor: value < 0 ? '#ff0000' : '#007bff',
                    borderRadius: '4px',
                    position: 'absolute',
                    left: value < 0 ? `${100 - width}px` : '100px'
                  }}></div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default AdvancedTable;
