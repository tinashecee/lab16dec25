export const getTimeAgo = (date: string, time: string) => {
  const now = new Date();
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  // Create date object for the update time
  const updateDate = new Date(year, month - 1, day, hours, minutes); // month is 0-based
  const diffInMilliseconds = now.getTime() - updateDate.getTime();

  // Calculate different time units
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Calculate remaining hours after removing complete days
  const remainingHours = diffInHours - diffInDays * 24;

  // Format the output based on the time difference
  if (diffInDays > 0) {
    if (remainingHours > 0) {
      return `${diffInDays} days and ${remainingHours} hours ago`;
    }
    return `${diffInDays} days ago`;
  }

  if (diffInHours > 0) {
    return `${diffInHours} hours ago`;
  }

  if (diffInMinutes > 0) {
    return `${diffInMinutes} minutes ago`;
  }

  return `${diffInSeconds} seconds ago`;
};

// Standardized function to format dates in CAT timezone with 24-hour format
export const formatDateCAT = (dateValue: unknown): string => {
  if (!dateValue) return "N/A";
  
  let date: Date;
  
  // Handle Firestore Timestamp
  if (typeof dateValue === "object" && dateValue !== null && "seconds" in dateValue) {
    date = new Date((dateValue as { seconds: number }).seconds * 1000);
  } 
  // Handle Date object
  else if (dateValue instanceof Date) {
    date = dateValue;
  }
  // Handle string date
  else if (typeof dateValue === "string") {
    date = new Date(dateValue);
  }
  // Handle unknown format
  else {
    return "Invalid date";
  }
  
  // If date is invalid, return N/A
  if (isNaN(date.getTime())) {
    return "N/A";
  }
  
  // Format date in CAT timezone (Africa/Johannesburg)
  return date.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(',', '');
};
