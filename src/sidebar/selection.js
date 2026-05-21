export function nextSelectedHistoryId(currentSelectedId, clickedId) {
  return currentSelectedId === clickedId ? null : clickedId;
}
