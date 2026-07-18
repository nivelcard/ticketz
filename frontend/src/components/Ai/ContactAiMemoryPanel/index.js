import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import { DeleteOutline, GetApp, ThumbUpOutlined } from "@material-ui/icons";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1.5)
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  },
  tableWrap: {
    overflowX: "auto"
  },
  valueCell: {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
}));

const VERIFICATION_LABELS = {
  unverified: "Não verificado",
  user_stated: "Informado pelo usuário",
  system_verified: "Verificado (sistema)",
  human_verified: "Verificado (humano)"
};

const MEMORY_TYPE_LABELS = {
  preference: "Preferência",
  summary: "Resumo",
  fact: "Fato",
  human_note: "Nota humana",
  agent_note: "Nota do agente IA"
};

const VERIFICATION_COLORS = {
  unverified: "default",
  user_stated: "default",
  system_verified: "primary",
  human_verified: "primary"
};

const formatDate = value =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

const ContactAiMemoryPanel = ({ contactId }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [items, setItems] = useState([]);
  const [actionId, setActionId] = useState(null);

  const loadMemory = useCallback(async () => {
    if (!contactId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/ai/contacts/${contactId}/memory`);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const handlePromote = async memoryId => {
    try {
      setActionId(memoryId);
      await api.patch(`/ai/contacts/${contactId}/memory/${memoryId}`, {
        verificationStatus: "human_verified",
        reason: "manual_promote"
      });
      toast.success("Memória promovida para verificação humana");
      loadMemory();
    } catch (err) {
      toastError(err);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async memoryId => {
    try {
      setActionId(memoryId);
      await api.patch(`/ai/contacts/${contactId}/memory/${memoryId}`, {
        softDelete: true,
        reason: "manual_delete"
      });
      toast.success("Memória removida");
      loadMemory();
    } catch (err) {
      toastError(err);
    } finally {
      setActionId(null);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const { data } = await api.get(`/ai/contacts/${contactId}/memory/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contact-${contactId}-memory.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída");
    } catch (err) {
      toastError(err);
    } finally {
      setExporting(false);
    }
  };

  if (!contactId) {
    return null;
  }

  return (
    <Paper square variant="outlined" className={classes.root}>
      <div className={classes.header}>
        <Typography variant="subtitle1">Memória IA do contato</Typography>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={exporting ? <CircularProgress size={14} /> : <GetApp />}
          disabled={exporting || loading}
          onClick={handleExport}
        >
          Exportar
        </Button>
      </div>

      {loading ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <div className={classes.tableWrap}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Chave</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Verificação</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length ? (
                items.map(item => {
                  const canPromote =
                    item.verificationStatus !== "human_verified";
                  const busy = actionId === item.id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {MEMORY_TYPE_LABELS[item.memoryType] ||
                          item.memoryType ||
                          "—"}
                      </TableCell>
                      <TableCell>{item.key || "—"}</TableCell>
                      <TableCell className={classes.valueCell}>
                        <Tooltip title={item.value || ""} arrow>
                          <span>{item.value || "—"}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            VERIFICATION_LABELS[item.verificationStatus] ||
                            item.verificationStatus ||
                            "—"
                          }
                          color={
                            VERIFICATION_COLORS[item.verificationStatus] ||
                            "default"
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        {canPromote && (
                          <Tooltip title="Promover para verificação humana">
                            <span>
                              <IconButton
                                size="small"
                                disabled={busy}
                                onClick={() => handlePromote(item.id)}
                              >
                                <ThumbUpOutlined fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Remover memória">
                          <span>
                            <IconButton
                              size="small"
                              disabled={busy}
                              onClick={() => handleDelete(item.id)}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="textSecondary">
                      Nenhuma memória registrada para este contato.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {items.length > 0 && (
        <Typography
          variant="caption"
          color="textSecondary"
          display="block"
          style={{ marginTop: 8 }}
        >
          Atualizado: {formatDate(items[0]?.updatedAt)}
        </Typography>
      )}
    </Paper>
  );
};

export default ContactAiMemoryPanel;
