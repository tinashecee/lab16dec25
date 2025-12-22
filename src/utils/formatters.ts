export const formatCurrency = (amount: number): string => {
  return `ZWG ${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
}; 