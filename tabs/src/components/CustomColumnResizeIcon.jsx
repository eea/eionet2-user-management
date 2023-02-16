import { React, useState } from 'react';
import { GridSeparatorIcon } from '@mui/x-data-grid';

export default function CustomColumnResizeIcon() {
  const [initialPos, setInitialPos] = useState(null);
  const [initialSize, setInitialSize] = useState(null);

  const initial = (e) => {
    let resizable = document.querySelector("[role='columnheader'][tabindex='0']");

    setInitialPos(e.clientX);
    setInitialSize(resizable.offsetWidth);
  };

  const resize = (e) => {
    const columnHeader = document.querySelector("[role='columnheader'][tabindex='0']"),
      columnHeaderStyle = columnHeader.style,
      cells = document.querySelectorAll(
        "[role='cell'][aria-colindex='" + columnHeader.ariaColIndex + "']",
      );

    const newWidth = parseInt(initialSize) + parseInt(e.clientX - initialPos);

    for (var i = 0; i < cells.length; i++) {
      const style = cells[i].style;
      style.width = style.minWidth = style.maxWidth = `${newWidth}px`;
    }
    columnHeaderStyle.width =
      columnHeaderStyle.minWidth =
      columnHeaderStyle.maxWidth =
        `${newWidth}px`;
  };

  return (
    <div className="resizable" draggable onDragStart={initial} onDrag={resize}>
      <GridSeparatorIcon />
    </div>
  );
}
