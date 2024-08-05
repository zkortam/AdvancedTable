import React from 'react';

interface Props {
  titles: string[];
  columnLabel: string;
  sortedData: { index: number | null, direction: string | null };
  tableSettings: any;
  handleSortClick: (e: React.MouseEvent, index: number) => void;
  handleMouseDown: (e: React.MouseEvent, index: number) => void;
}

const TableHeader: React.FC<Props> = ({
  titles, columnLabel, sortedData, tableSettings, handleSortClick, handleMouseDown
}) => (
  <thead>
    <tr>
      {tableSettings.showRowNumbers && (
        <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: '50px', position: 'relative' }}>
          #
        </th>
      )}
      <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[0]}px`, position: 'relative' }}
          onContextMenu={(e) => handleSortClick(e, 0)}>
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
          onMouseDown={(e) => handleMouseDown(e, 0)}
        />
      </th>
      {titles.map((title, index) => (
        <React.Fragment key={index}>
          {tableSettings.showValueColumns && (
            <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 1]}px`, position: 'relative', color: (sortedData.index === index * 3 + 1) ? 'green' : 'inherit' }}
                onContextMenu={(e) => handleSortClick(e, index * 3 + 1)}>
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
                onMouseDown={(e) => handleMouseDown(e, index * 3 + 1)}
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
                onMouseDown={(e) => handleMouseDown(e, index * 3 + 2)}
              />
            </th>
          )}
          {tableSettings.showLineCharts && (
            <th className="chart-cell" style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: `${tableSettings.columnWidths[index * 3 + 3]}px`, position: 'relative' }}>
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
          )}
        </React.Fragment>
      ))}
    </tr>
  </thead>
);

export default TableHeader;
