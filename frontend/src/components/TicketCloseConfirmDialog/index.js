import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@material-ui/core";
import { i18n } from "../../translate/i18n";

const TicketCloseConfirmDialog = ({
  open,
  ticket,
  loading = false,
  onCancel,
  onConfirm
}) => {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setNote("");
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{i18n.t("ticketsList.closeDialog.title")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" paragraph>
          {i18n.t("ticketsList.closeDialog.description")}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          variant="outlined"
          label={i18n.t("ticketsList.closeDialog.noteLabel")}
          placeholder={i18n.t("ticketsList.closeDialog.notePlaceholder")}
          value={note}
          onChange={event => setNote(event.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {i18n.t("ticketsList.closeDialog.cancel")}
        </Button>
        <Button
          color="secondary"
          variant="contained"
          disabled={loading}
          onClick={() => onConfirm(note.trim())}
        >
          {loading
            ? i18n.t("ticketsList.closeDialog.closing")
            : i18n.t("ticketsList.closeDialog.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketCloseConfirmDialog;
