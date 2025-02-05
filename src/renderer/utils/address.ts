export const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

export const ellipsisAddress = ellipsis;

export const isSameAddress = (a: string, b: string) => {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};
