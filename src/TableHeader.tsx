import React from 'react';

interface Props {
  titles: string[];
  columnLabel: string;
  sortedData: { column: number | null, order: 'asc' | 'desc' | null };
  tableSettings: any;
  handleSortClick: (column: number) => void;
  handleMouseDown: (e: React.MouseEvent, index: number) => void;
}

const TableHeader: React.FC<Props> = ({
  titles, columnLabel, sortedData, tableSettings, handleSortClick, handleMouseDown
}) => {
  // Function to get the arrow based on sort state
  const getSortArrow = (column: number) => {
    if (sortedData.column === column) {
      if (sortedData.order === 'asc') {
        return '↓'; // Down arrow
      } else if (sortedData.order === 'desc') {
        return '↑'; // Up arrow
      }
    }
    return ''; // No arrow
  };

  return (
    <thead>
      <tr>
        {tableSettings.showRowNumbers && (
          <th style={{ border: `2px solid ${tableSettings.tableBorderColor}`, width: '50px', position: 'relative' }}>
            #
          </th>
        )}
        <th
          style={{
            border: `2px solid ${tableSettings.tableBorderColor}`,
            width: `${tableSettings.columnWidths[0]}px`,
            position: 'relative',
          }}
          onClick={() => handleSortClick(-1)}
        >
          {columnLabel} {getSortArrow(-1)}
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
              <th
                style={{
                  border: `2px solid ${tableSettings.tableBorderColor}`,
                  width: `${tableSettings.columnWidths[index * 3 + 1]}px`,
                  position: 'relative',
                  color: sortedData.column === index * 3 + 1 ? 'green' : 'inherit',
                }}
                onClick={() => handleSortClick(index)}
              >
                {title} Value {getSortArrow(index)}
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
            {/* Other columns like charts and sparklines */}
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );
};

export default TableHeader;
