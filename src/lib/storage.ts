export const saveHistory = (item: any) => {
  const oldHistory = JSON.parse(
    localStorage.getItem("history") || "[]"
  );

  localStorage.setItem(
    "history",
    JSON.stringify([item, ...oldHistory])
  );
};

export const getHistory = () => {
  return JSON.parse(
    localStorage.getItem("history") || "[]"
  );
};