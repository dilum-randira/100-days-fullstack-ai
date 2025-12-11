export const formatDateTime = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString();
};

export const formatNumber = (value: number, fractionDigits = 0) => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

export const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
