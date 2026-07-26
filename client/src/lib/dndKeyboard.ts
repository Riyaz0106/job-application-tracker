import { KeyboardCode, type KeyboardCoordinateGetter } from '@dnd-kit/core';

// Keyboard drag movement for a column board.
//
// dnd-kit's default getter translates 25px per arrow press; our columns are ~300px
// wide, so that would take a dozen presses to cross one. This moves one COLUMN per
// left/right press by reading the live droppable rects (no hardcoded widths).
// Up/Down are intentionally inert: card order within a column is server-defined
// (createdAt desc), so there is no vertical position to choose.
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context },
) => {
  const direction =
    event.code === KeyboardCode.Right
      ? 1
      : event.code === KeyboardCode.Left
        ? -1
        : 0;
  if (direction === 0) return undefined;

  const collisionRect = context.collisionRect;
  if (!collisionRect) return undefined;

  // Enabled columns, left to right.
  const columns = context.droppableContainers
    .toArray()
    .filter((container) => !container.disabled && container.rect.current)
    .sort((a, b) => (a.rect.current?.left ?? 0) - (b.rect.current?.left ?? 0));
  if (columns.length === 0) return undefined;

  // Which column is the dragged card currently over? (nearest centre)
  const cardCentreX = collisionRect.left + collisionRect.width / 2;
  let currentIndex = 0;
  let smallestGap = Number.POSITIVE_INFINITY;
  columns.forEach((container, index) => {
    const rect = container.rect.current;
    if (!rect) return;
    const gap = Math.abs(rect.left + rect.width / 2 - cardCentreX);
    if (gap < smallestGap) {
      smallestGap = gap;
      currentIndex = index;
    }
  });

  const from = columns[currentIndex]?.rect.current;
  const to = columns[currentIndex + direction]?.rect.current;
  if (!from || !to) return undefined; // already at the first/last column

  event.preventDefault();
  return {
    x: currentCoordinates.x + (to.left - from.left),
    y: currentCoordinates.y,
  };
};
