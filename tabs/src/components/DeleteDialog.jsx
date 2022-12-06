import { React } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import messages from '../data/messages.json';

export default function DeleteDialog({ open, title, message, groupsString, onClose, onYes, onNo }) {
  let propMessage = message();
  const hasGroups = groupsString && groupsString.length > 0;
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="responsive-dialog-title">
      <DialogTitle id="responsive-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {propMessage}
          <br />
          {hasGroups && messages.UserList.UserMemberships}
          <br />
          {hasGroups && groupsString}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="secondary" size="small" onClick={onYes}>
          Yes
        </Button>
        <Button variant="contained" color="secondary" size="small" onClick={onNo}>
          No
        </Button>
      </DialogActions>
    </Dialog>
  );
}
