import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@material-ui/core";
import {
  History,
  MoreVert,
  Refresh,
  CloudUpload,
  NoteAdd
} from "@material-ui/icons";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { useAiPageStyles } from "../../components/Ai/shared";
import {
  AiFormSelect,
  AiFormTextField,
  AiSectionPaper
} from "../../components/Ai/forms";

const LIFECYCLE_STATUSES = [
  { value: "", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "review", label: "Em revisão" },
  { value: "approved", label: "Aprovado" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" }
];

const LIFECYCLE_LABELS = {
  draft: "Rascunho",
  review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  archived: "Arquivado"
};

const INGESTION_LABELS = {
  pending: "Pendente",
  processing: "Processando",
  indexed: "Indexado",
  failed: "Falhou"
};

const lifecycleChipColor = status => {
  switch (status) {
    case "published":
      return "primary";
    case "approved":
      return "secondary";
    case "review":
      return "default";
    case "archived":
      return "default";
    default:
      return "default";
  }
};

const ingestionChipColor = status => {
  switch (status) {
    case "indexed":
      return "primary";
    case "processing":
      return "secondary";
    case "failed":
      return "default";
    default:
      return "default";
  }
};

const defaultCreateForm = {
  knowledgeBaseId: "",
  categoryId: "",
  title: "",
  content: ""
};

const AiAssets = () => {
  const classes = useAiPageStyles();
  const [assets, setAssets] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    lifecycleStatus: "",
    knowledgeBaseId: ""
  });
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [file, setFile] = useState(null);
  const [openText, setOpenText] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAsset, setMenuAsset] = useState(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsAsset, setVersionsAsset] = useState(null);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsAsset, setJobsAsset] = useState(null);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackVersionId, setRollbackVersionId] = useState("");

  const baseOptions = useMemo(
    () =>
      bases.map(base => ({
        value: base.id,
        label: base.name
      })),
    [bases]
  );

  const baseNameById = useMemo(() => {
    const map = {};
    bases.forEach(base => {
      map[base.id] = base.name;
    });
    return map;
  }, [bases]);

  const loadBases = useCallback(async () => {
    try {
      const { data } = await api.get("/ai/knowledge-bases");
      setBases((Array.isArray(data) ? data : []).filter(base => base.active));
    } catch (err) {
      toastError(err);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.lifecycleStatus) {
        params.lifecycleStatus = filters.lifecycleStatus;
      }
      if (filters.knowledgeBaseId) {
        params.knowledgeBaseId = filters.knowledgeBaseId;
      }
      const { data } = await api.get("/ai/assets", { params });
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filters.knowledgeBaseId, filters.lifecycleStatus]);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleSaveText = async () => {
    try {
      await api.post("/ai/assets/text", {
        knowledgeBaseId: Number(createForm.knowledgeBaseId),
        categoryId: createForm.categoryId
          ? Number(createForm.categoryId)
          : undefined,
        title: createForm.title,
        content: createForm.content
      });
      toast.success("Ativo criado em rascunho");
      setOpenText(false);
      setCreateForm(defaultCreateForm);
      loadAssets();
    } catch (err) {
      toastError(err);
    }
  };

  const handleUpload = async () => {
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("knowledgeBaseId", createForm.knowledgeBaseId);
      if (createForm.categoryId) {
        data.append("categoryId", createForm.categoryId);
      }
      data.append("title", createForm.title || file?.name || "Upload");
      await api.post("/ai/assets/upload", data);
      toast.success("Upload realizado — ativo em rascunho");
      setFile(null);
      setCreateForm(defaultCreateForm);
      loadAssets();
    } catch (err) {
      toastError(err);
    }
  };

  const runLifecycleAction = async (asset, action, body) => {
    try {
      await api.post(`/ai/assets/${asset.id}/${action}`, body || {});
      toast.success("Ação executada com sucesso");
      loadAssets();
    } catch (err) {
      toastError(err);
    }
  };

  const openMenu = (event, asset) => {
    setMenuAnchor(event.currentTarget);
    setMenuAsset(asset);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuAsset(null);
  };

  const handleMenuAction = async action => {
    const asset = menuAsset;
    closeMenu();
    if (!asset) {
      return;
    }

    if (action === "versions") {
      try {
        const { data } = await api.get(`/ai/assets/${asset.id}/versions`);
        setVersions(Array.isArray(data) ? data : []);
        setVersionsAsset(asset);
        setVersionsOpen(true);
      } catch (err) {
        toastError(err);
      }
      return;
    }

    if (action === "jobs") {
      try {
        const { data } = await api.get(`/ai/assets/${asset.id}/ingestion-jobs`);
        setJobs(Array.isArray(data) ? data : []);
        setJobsAsset(asset);
        setJobsOpen(true);
      } catch (err) {
        toastError(err);
      }
      return;
    }

    if (action === "rollback") {
      try {
        const { data } = await api.get(`/ai/assets/${asset.id}/versions`);
        setVersions(Array.isArray(data) ? data : []);
        setVersionsAsset(asset);
        setRollbackVersionId("");
        setRollbackOpen(true);
      } catch (err) {
        toastError(err);
      }
      return;
    }

    await runLifecycleAction(asset, action);
  };

  const handleRollback = async () => {
    if (!versionsAsset || !rollbackVersionId) {
      return;
    }
    try {
      await api.post(`/ai/assets/${versionsAsset.id}/rollback`, {
        versionId: Number(rollbackVersionId)
      });
      toast.success("Rollback executado");
      setRollbackOpen(false);
      loadAssets();
    } catch (err) {
      toastError(err);
    }
  };

  const renderLifecycleActions = asset => {
    const status = asset.lifecycleStatus;
    const actions = [];

    if (status === "draft") {
      actions.push({ key: "submit-review", label: "Enviar para revisão" });
    }
    if (status === "review") {
      actions.push({ key: "approve", label: "Aprovar" });
    }
    if (status === "approved") {
      actions.push({ key: "publish", label: "Publicar" });
    }
    if (status === "published") {
      actions.push({ key: "archive", label: "Arquivar" });
      actions.push({ key: "reindex", label: "Reindexar" });
      actions.push({ key: "rollback", label: "Rollback de versão" });
    }
    if (status === "archived") {
      actions.push({ key: "publish", label: "Republicar" });
    }

    actions.push({ key: "versions", label: "Histórico de versões" });
    actions.push({ key: "jobs", label: "Jobs de ingestão" });

    return actions;
  };

  const getIngestionStatus = asset => {
    const version =
      asset.currentVersion ||
      asset.publishedVersion ||
      (asset.currentVersionId ? { ingestionStatus: "pending" } : null);
    return version?.ingestionStatus || "—";
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>IA — Ativos de Conhecimento</Title>
        <Box display="flex" style={{ gap: 8 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<NoteAdd />}
            onClick={() => setOpenText(true)}
          >
            Texto manual
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={loadAssets}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Box>
      </MainHeader>

      <div className={classes.pageContent}>
        <AiSectionPaper
          title="Filtros"
          subtitle="Refine a listagem por base e status editorial."
        >
          <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            <Box flex="1 1 220px" minWidth={200}>
              <AiFormSelect
                label="Base de conhecimento"
                value={filters.knowledgeBaseId}
                onChange={e =>
                  setFilters({
                    ...filters,
                    knowledgeBaseId: String(e.target.value)
                  })
                }
                options={baseOptions}
                emptyLabel="Todas as bases"
              />
            </Box>
            <Box flex="1 1 220px" minWidth={200}>
              <AiFormSelect
                label="Status editorial"
                value={filters.lifecycleStatus}
                onChange={e =>
                  setFilters({
                    ...filters,
                    lifecycleStatus: String(e.target.value)
                  })
                }
                options={LIFECYCLE_STATUSES}
                allowEmpty={false}
              />
            </Box>
          </Box>
        </AiSectionPaper>

        <AiSectionPaper
          title="Upload de arquivos"
          subtitle="Envie PDF, DOCX, TXT, MD ou HTML. O ativo inicia em rascunho."
        >
          <AiFormSelect
            label="Base de conhecimento"
            value={createForm.knowledgeBaseId}
            onChange={e =>
              setCreateForm({
                ...createForm,
                knowledgeBaseId: String(e.target.value)
              })
            }
            options={baseOptions}
          />
          <AiFormTextField
            label="Título (opcional)"
            value={createForm.title}
            onChange={e =>
              setCreateForm({ ...createForm, title: e.target.value })
            }
          />
          <Box mt={1} mb={2}>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,.html"
              onChange={e => setFile(e.target.files[0])}
            />
            {file && (
              <Typography variant="body2" color="textSecondary">
                Arquivo selecionado: {file.name}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CloudUpload />}
            disabled={!file || !createForm.knowledgeBaseId}
            onClick={handleUpload}
          >
            Upload de arquivo
          </Button>
        </AiSectionPaper>

        <AiSectionPaper
          title="Ativos cadastrados"
          subtitle="Workflow editorial: rascunho → revisão → aprovado → publicado."
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Base</TableCell>
                <TableCell>Status editorial</TableCell>
                <TableCell>Indexação</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {loading
                      ? "Carregando..."
                      : "Nenhum ativo encontrado com os filtros atuais."}
                  </TableCell>
                </TableRow>
              )}
              {assets.map(asset => {
                const ingestionStatus = getIngestionStatus(asset);
                return (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.title}</TableCell>
                    <TableCell>{asset.assetType}</TableCell>
                    <TableCell>
                      {baseNameById[asset.knowledgeBaseId] ||
                        asset.knowledgeBaseId}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          LIFECYCLE_LABELS[asset.lifecycleStatus] ||
                          asset.lifecycleStatus
                        }
                        color={lifecycleChipColor(asset.lifecycleStatus)}
                      />
                    </TableCell>
                    <TableCell>
                      {ingestionStatus !== "—" ? (
                        <Chip
                          size="small"
                          label={
                            INGESTION_LABELS[ingestionStatus] || ingestionStatus
                          }
                          color={ingestionChipColor(ingestionStatus)}
                          variant={
                            ingestionStatus === "failed"
                              ? "default"
                              : "outlined"
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ações do ativo">
                        <IconButton
                          size="small"
                          onClick={event => openMenu(event, asset)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Histórico de versões">
                        <IconButton
                          size="small"
                          onClick={async () => {
                            try {
                              const { data } = await api.get(
                                `/ai/assets/${asset.id}/versions`
                              );
                              setVersions(Array.isArray(data) ? data : []);
                              setVersionsAsset(asset);
                              setVersionsOpen(true);
                            } catch (err) {
                              toastError(err);
                            }
                          }}
                        >
                          <History />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AiSectionPaper>
      </div>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        {menuAsset &&
          renderLifecycleActions(menuAsset).map(action => (
            <MenuItem
              key={action.key}
              onClick={() => handleMenuAction(action.key)}
            >
              {action.label}
            </MenuItem>
          ))}
      </Menu>

      <Dialog open={openText} onClose={() => setOpenText(false)} fullWidth>
        <DialogTitle>Novo ativo — texto manual</DialogTitle>
        <DialogContent dividers>
          <AiFormSelect
            label="Base de conhecimento"
            value={createForm.knowledgeBaseId}
            onChange={e =>
              setCreateForm({
                ...createForm,
                knowledgeBaseId: String(e.target.value)
              })
            }
            options={baseOptions}
          />
          <AiFormTextField
            label="Título"
            value={createForm.title}
            onChange={e =>
              setCreateForm({ ...createForm, title: e.target.value })
            }
          />
          <AiFormTextField
            label="Conteúdo"
            multiline
            rows={8}
            value={createForm.content}
            onChange={e =>
              setCreateForm({ ...createForm, content: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenText(false)}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleSaveText}
            disabled={!createForm.knowledgeBaseId || !createForm.content.trim()}
          >
            Criar rascunho
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Versões — {versionsAsset?.title || "Ativo"}</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Indexação</TableCell>
                <TableCell>Chunks</TableCell>
                <TableCell>Resumo</TableCell>
                <TableCell>Criada em</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {versions.map(version => (
                <TableRow key={version.id}>
                  <TableCell>{version.versionNumber}</TableCell>
                  <TableCell>{version.title}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        INGESTION_LABELS[version.ingestionStatus] ||
                        version.ingestionStatus
                      }
                      color={ingestionChipColor(version.ingestionStatus)}
                    />
                  </TableCell>
                  <TableCell>{version.chunkCount ?? "—"}</TableCell>
                  <TableCell>{version.changeSummary || "—"}</TableCell>
                  <TableCell>
                    {version.createdAt
                      ? new Date(version.createdAt).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {versions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhuma versão registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={jobsOpen}
        onClose={() => setJobsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Jobs de ingestão — {jobsAsset?.title || "Ativo"}
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tentativas</TableCell>
                <TableCell>Erro</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Fim</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map(job => (
                <TableRow key={job.id}>
                  <TableCell>{job.jobType}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.attempts ?? "—"}</TableCell>
                  <TableCell>{job.errorMessage || "—"}</TableCell>
                  <TableCell>
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {job.finishedAt
                      ? new Date(job.finishedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum job de ingestão registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Rollback — {versionsAsset?.title || "Ativo"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Selecione a versão para restaurar como publicada.
          </Typography>
          <AiFormSelect
            label="Versão alvo"
            value={rollbackVersionId}
            onChange={e => setRollbackVersionId(String(e.target.value))}
            options={versions.map(version => ({
              value: version.id,
              label: `v${version.versionNumber} — ${
                INGESTION_LABELS[version.ingestionStatus] ||
                version.ingestionStatus
              }`
            }))}
            allowEmpty
            emptyLabel="Selecione a versão"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackOpen(false)}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleRollback}
            disabled={!rollbackVersionId}
          >
            Executar rollback
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default AiAssets;
