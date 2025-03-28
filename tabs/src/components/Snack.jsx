import { React } from 'react';
import { Alert, Snackbar } from '@mui/material';

export default function Snack({ open, message, onClose }) {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      autoHideDuration={6000}
      onClose={onClose}
    >
      <Alert onClose={onClose} severity="success" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
