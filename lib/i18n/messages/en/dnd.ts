export const dnd = {
  instructions:
    "Press space or enter to pick up an application card. While dragging, use the arrow keys to move it to another status column, press space or enter to drop it there, or press escape to cancel.",
  theApplication: "the application",
  pickedUp: "Picked up {subject}.",
  over: "{subject} is over the {column} column.",
  dropped: "Dropped {subject} on the {column} column.",
  droppedOutside: "{subject} was dropped outside any column. No change was made.",
  cancelled: "Moving {subject} was cancelled.",
  handleLabel: "Move {company} application",
  moveTitle: "Move to {status}?",
  moveDescription: "{subject} will be moved to {status}.",
  move: "Move",
} as const;
