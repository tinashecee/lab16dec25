export const handleRuntimeError = (error: Error) => {
  // Ignore extension-related errors
  if (error.message.includes('message port closed') || 
      error.message.includes('extension port')) {
    return;
  }
  
  // Log other errors
  console.error('Application Error:', error);
}; 