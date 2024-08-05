// utils.ts
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
  lists: number[][],
  groupLabels: (string | number)[],
  setGroupLabels: React.Dispatch<React.SetStateAction<(string | number)[]>>,
  setLists: React.Dispatch<React.SetStateAction<number[][]>>,
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
          ? newLists[listIndex][a] - newLists[listIndex][b]
          : newLists[listIndex][b] - newLists[listIndex][a];
      });

      setLists(newLists.map(list => sortedIndices.map(i => list[i])));
      setGroupLabels(sortedIndices.map(i => groupLabels[i]));
    }

    setSortedData({ index, direction });
  }

  setSortModalOpen({ open: false, index: null, top: null, left: null });
};
