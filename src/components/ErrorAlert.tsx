export const ErrorAlert = ({ message }: { message: string }) => (
  <Alert severity="error" sx={{ mb: 2 }}>
    <AlertTitle>Feed Error</AlertTitle>
    {message}
  </Alert>
); 