import type { MultilineElementTransformer } from '@lexical/markdown';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import type { ElementNode } from 'lexical';
import { $createParagraphNode, $createTextNode, $isElementNode } from 'lexical';

const TABLE_ROW_REGEXP = /^\|.+\|\s*$/;
const TABLE_SEPARATOR_REGEXP = /^(\| ?:?-+:? ?)+\|\s*$/;

function parseTableRow(line: string): string[] {
  const cells: string[] = [];
  const parts = line.split('|');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (i === 0 && part === '') continue;
    if (i === parts.length - 1 && part === '') continue;
    cells.push(part);
  }
  return cells;
}

function isTableSeparator(line: string): boolean {
  return TABLE_SEPARATOR_REGEXP.test(line);
}

export const TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  type: 'multiline-element',

  regExpStart: TABLE_ROW_REGEXP,

  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex, startMatch }) => {
    let endLineIndex = startLineIndex;
    while (endLineIndex < lines.length) {
      const line = lines[endLineIndex];
      if (line === '' || !TABLE_ROW_REGEXP.test(line)) {
        break;
      }
      endLineIndex++;
    }
    endLineIndex--;

    const tableLines = lines.slice(startLineIndex, endLineIndex + 1);
    if (tableLines.length === 0) {
      return null;
    }

    TABLE.replace(rootNode, null, startMatch, null, tableLines, true);
    return [true, endLineIndex];
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by MultilineElementTransformer signature
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, _isImport) => {
    if (!linesInBetween || linesInBetween.length === 0) {
      return;
    }

    const rows: string[][] = [];
    let hasSeparator = false;

    for (let i = 0; i < linesInBetween.length; i++) {
      const line = linesInBetween[i];
      if (i === 1 && isTableSeparator(line)) {
        hasSeparator = true;
        continue;
      }
      const cells = parseTableRow(line);
      if (cells.length === 0) continue;
      rows.push(cells);
    }

    const columnCount = Math.max(...rows.map((r) => r.length), 1);
    const tableNode = $createTableNode();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const rowCells = rows[rowIndex];
      const isHeaderRow = hasSeparator ? rowIndex === 0 : false;
      const rowNode = $createTableRowNode();

      for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const cellText = rowCells[colIndex] ?? '';
        const headerState = isHeaderRow
          ? TableCellHeaderStates.ROW
          : TableCellHeaderStates.NO_STATUS;
        const cellNode = $createTableCellNode(headerState);
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(cellText));
        cellNode.append(paragraph);
        rowNode.append(cellNode);
      }
      tableNode.append(rowNode);
    }

    rootNode.append(tableNode);
  },

  export: (node, traverseChildren) => {
    if (!$isTableNode(node)) {
      return null;
    }
    const tableNode = node as TableNode;
    const rows: string[] = [];
    const children = tableNode.getChildren();
    let columnCount = 0;

    for (const child of children) {
      if (!child.getType().includes('TableRow') || !$isElementNode(child)) continue;
      const cells: string[] = [];
      for (const cell of child.getChildren()) {
        if (!cell.getType().includes('TableCell')) continue;
        const text = traverseChildren(cell as ElementNode);
        cells.push(text.trim());
      }
      columnCount = Math.max(columnCount, cells.length);
      rows.push('| ' + cells.join(' | ') + ' |');
    }

    if (rows.length === 0) return null;

    const separator = '| ' + Array(Math.max(columnCount, 1)).fill('---').join(' | ') + ' |';
    return [rows[0], separator, ...rows.slice(1)].join('\n');
  },
};
