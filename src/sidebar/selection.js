export function nextSelectedHistoryId(currentSelectedId, clickedId) {
  return currentSelectedId === clickedId ? null : clickedId;
}

export function nextHistoryPanelState({ selectedId = null } = {}, clickedId) {
  if (selectedId === clickedId) {
    return {
      selectedId: null,
      closingId: clickedId
    };
  }

  return {
    selectedId: clickedId,
    closingId: null
  };
}
