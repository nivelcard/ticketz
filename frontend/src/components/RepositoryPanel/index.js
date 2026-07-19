import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import SendIcon from "@material-ui/icons/Send";
import FolderSharedIcon from "@material-ui/icons/FolderShared";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
  item: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "#1e2a38" : "#f5f9ff"
    }
  },
  selected: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.type === "dark" ? "#1b2838" : "#eef5ff"
  },
  preview: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: 6,
    fontSize: "0.875rem"
  },
  tabs: {
    marginBottom: theme.spacing(1),
    minHeight: 36
  },
  itemRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1)
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    objectFit: "cover",
    flexShrink: 0,
    backgroundColor:
      theme.palette.type === "dark" ? "#243447" : theme.palette.grey[200]
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    textAlign: "center",
    color: theme.palette.text.secondary,
    backgroundColor:
      theme.palette.type === "dark" ? "#243447" : theme.palette.grey[200]
  }
}));

const typeLabel = type => {
  const map = {
    link: "Link",
    pdf: "PDF",
    image: "Imagem",
    audio: "Áudio",
    video: "Vídeo",
    document: "Documento",
    text: "Texto",
    message_template: "Modelo"
  };
  return map[type] || type;
};

const VIEWS = [
  { key: "all", label: "Todos" },
  { key: "favorites", label: "Favoritos" },
  { key: "recent", label: "Recentes" },
  { key: "popular", label: "Mais usados" }
];

const RepositoryPanel = ({ open, onClose, ticket }) => {
  const classes = useStyles();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [view, setView] = useState("all");
  const [selected, setSelected] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [thumbUrls, setThumbUrls] = useState({});

  const loadCategories = useCallback(async () => {
    if (!ticket?.id) return;
    try {
      const { data } = await api.get(
        `/tickets/${ticket.id}/repository/categories`
      );
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, [ticket?.id]);

  const loadItems = useCallback(async () => {
    if (!ticket?.id) return;
    setLoading(true);
    try {
      const params = { view };
      if (view === "all") {
        if (search.trim()) params.search = search.trim();
        if (contentType) params.contentType = contentType;
        if (categoryId) params.categoryId = categoryId;
      }
      const { data } = await api.get(`/tickets/${ticket.id}/repository`, {
        params
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [ticket?.id, search, contentType, categoryId, view]);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open, loadCategories]);

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, view, loadItems]);

  useEffect(() => {
    if (selected) {
      setCaption(selected.sendCaption || "");
    }
  }, [selected]);

  useEffect(() => {
    if (!open || !ticket?.id || !items.length) {
      return undefined;
    }

    let active = true;
    const createdUrls = [];

    const loadThumbs = async () => {
      const next = {};
      const imageItems = items.filter(
        item =>
          item.contentType === "image" &&
          (item.previewAvailable || item.storageKey || item.hasStorageFile)
      );

      await Promise.all(
        imageItems.map(async item => {
          try {
            const response = await api.get(
              `/tickets/${ticket.id}/repository/${item.id}/preview`,
              { responseType: "blob" }
            );
            const blob = response.data;
            const contentType =
              response.headers["content-type"] || blob?.type || "";
            if (!blob?.size || contentType.includes("application/json")) {
              return;
            }
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            next[item.id] = url;
          } catch {
            /* thumbnail optional */
          }
        })
      );

      if (active) {
        setThumbUrls(prev => {
          Object.values(prev).forEach(url => URL.revokeObjectURL(url));
          return next;
        });
      } else {
        createdUrls.forEach(url => URL.revokeObjectURL(url));
      }
    };

    loadThumbs();

    return () => {
      active = false;
      createdUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [open, ticket?.id, items]);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    const loadPreview = async () => {
      if (!open || !selected?.id || !ticket?.id) {
        setPreviewUrl(null);
        setPreviewError(null);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);

      try {
        if (
          selected.contentType === "text" ||
          selected.contentType === "link"
        ) {
          return;
        }

        if (!selected.previewAvailable && !selected.storageKey) {
          setPreviewError("Arquivo indisponível no storage.");
          return;
        }

        const response = await api.get(
          `/tickets/${ticket.id}/repository/${selected.id}/preview`,
          {
            responseType: "blob"
          }
        );

        if (!active) return;

        const blob = response.data;
        const contentType =
          response.headers["content-type"] || blob?.type || "";

        if (contentType.includes("application/json")) {
          const text = await blob.text();
          let message = "Não foi possível carregar a pré-visualização.";
          try {
            const json = JSON.parse(text);
            message = json.error || json.message || message;
          } catch {
            /* keep default */
          }
          setPreviewError(message);
          return;
        }

        if (!blob?.size) {
          setPreviewError("Arquivo indisponível no storage.");
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if (active) {
          setPreviewError(
            err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              "Não foi possível carregar a pré-visualização."
          );
        }
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    open,
    selected?.id,
    ticket?.id,
    selected?.storageKey,
    selected?.previewAvailable,
    selected?.contentType
  ]);

  const toggleFavorite = async (item, event) => {
    event.stopPropagation();
    try {
      const { data } = await api.post(
        `/tickets/${ticket.id}/repository/${item.id}/favorite`
      );
      setItems(prev =>
        prev.map(row =>
          row.id === item.id ? { ...row, favorited: data.favorited } : row
        )
      );
      if (selected?.id === item.id) {
        setSelected({ ...selected, favorited: data.favorited });
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleSend = async () => {
    if (!selected?.id || !ticket?.id) return;
    setSending(true);
    try {
      await api.post(`/tickets/${ticket.id}/repository/${selected.id}/send`, {
        caption
      });
      toast.success("Conteúdo enviado ao cliente");
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gridGap={8}>
            <FolderSharedIcon color="primary" />
            Repositório
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={view}
          onChange={(_, value) => {
            setView(value);
            setSelected(null);
          }}
          variant="scrollable"
          scrollButtons="auto"
          className={classes.tabs}
        >
          {VIEWS.map(tab => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>

        {view === "all" && (
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <TextField
              size="small"
              variant="outlined"
              label="Buscar"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadItems()}
              style={{ minWidth: 220 }}
            />
            <TextField
              select
              size="small"
              variant="outlined"
              label="Tipo"
              value={contentType}
              onChange={e => setContentType(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="link">Link</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="image">Imagem</MenuItem>
              <MenuItem value="document">Documento</MenuItem>
              <MenuItem value="audio">Áudio</MenuItem>
              <MenuItem value="text">Texto</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              variant="outlined"
              label="Categoria"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" onClick={loadItems} disabled={loading}>
              Filtrar
            </Button>
          </Box>
        )}

        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          gridGap={16}
        >
          <Box flex={1} minWidth={0}>
            {loading ? (
              <Typography color="textSecondary">Carregando...</Typography>
            ) : (
              items.map(item => (
                <Box
                  key={item.id}
                  className={`${classes.item} ${
                    selected?.id === item.id ? classes.selected : ""
                  }`}
                  onClick={() => setSelected(item)}
                >
                  <Box className={classes.itemRow}>
                    {item.contentType === "image" ? (
                      thumbUrls[item.id] ? (
                        <img
                          src={thumbUrls[item.id]}
                          alt=""
                          className={classes.thumb}
                        />
                      ) : (
                        <Box className={classes.thumbPlaceholder}>
                          {typeLabel(item.contentType)}
                        </Box>
                      )
                    ) : null}
                    <Box flex={1} minWidth={0}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="subtitle2">
                          {item.displayTitle || item.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gridGap={4}>
                          <Tooltip
                            title={
                              item.favorited ? "Remover favorito" : "Favoritar"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={e => toggleFavorite(item, e)}
                            >
                              {item.favorited ? (
                                <StarIcon fontSize="small" color="primary" />
                              ) : (
                                <StarBorderIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Chip
                            size="small"
                            label={typeLabel(item.contentType)}
                          />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {item.category || "Sem categoria"} · usado{" "}
                        {item.usageCount || 0}x
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {item.sendCaption || item.description || "—"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
            {!loading && !items.length && (
              <Typography color="textSecondary">
                {view === "favorites"
                  ? "Nenhum favorito ainda."
                  : view === "recent"
                    ? "Nenhum item usado recentemente."
                    : "Nenhum conteúdo disponível para este atendimento."}
              </Typography>
            )}
          </Box>

          <Box flex={1} minWidth={0}>
            {selected ? (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Pré-visualização
                </Typography>
                <div className={classes.preview}>
                  <strong>{selected.displayTitle || selected.name}</strong>
                  {previewLoading && (
                    <Typography variant="body2" style={{ marginTop: 8 }}>
                      Carregando pré-visualização…
                    </Typography>
                  )}
                  {previewError && (
                    <Typography
                      variant="body2"
                      color="error"
                      style={{ marginTop: 8 }}
                    >
                      {previewError}
                    </Typography>
                  )}
                  {previewUrl && selected.contentType === "image" && (
                    <Box mt={1}>
                      <img
                        src={previewUrl}
                        alt={selected.displayTitle || selected.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 240,
                          borderRadius: 6
                        }}
                      />
                    </Box>
                  )}
                  {previewUrl && selected.contentType !== "image" && (
                    <Box mt={1}>
                      <Button
                        size="small"
                        color="primary"
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir arquivo
                      </Button>
                    </Box>
                  )}
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    {selected.description}
                  </Typography>
                  {selected.externalUrl && (
                    <Typography variant="body2" style={{ marginTop: 8 }}>
                      {selected.externalUrl}
                    </Typography>
                  )}
                  {!selected.storageKey &&
                    ["image", "pdf", "audio", "video", "document"].includes(
                      selected.contentType
                    ) && (
                      <Typography
                        variant="body2"
                        color="error"
                        style={{ marginTop: 8 }}
                      >
                        Arquivo não encontrado no storage — envio indisponível
                        até reprocessar o item.
                      </Typography>
                    )}
                </div>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  size="small"
                  label="Mensagem ao enviar"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  style={{ marginTop: 12 }}
                />
              </>
            ) : (
              <Typography color="textSecondary">
                Selecione um item para revisar e enviar.
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          color="primary"
          variant="contained"
          startIcon={<SendIcon />}
          disabled={!selected || sending}
          onClick={handleSend}
        >
          Enviar ao cliente
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepositoryPanel;
