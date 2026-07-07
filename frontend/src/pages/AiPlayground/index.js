import React, { useEffect, useState } from "react";
import {
  Button,
  Paper,
  Typography,
  TextField,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from "@material-ui/core";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const AiPlayground = () => {
  const [agents, setAgents] = useState([]);
  const [bases, setBases] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: agentsData }, { data: basesData }] = await Promise.all([
          api.get("/ai/agents"),
          api.get("/ai/knowledge-bases")
        ]);
        setAgents(agentsData.filter(a => a.active));
        setBases(basesData.filter(b => b.active));
      } catch (err) {
        toastError(err);
      }
    };
    load();
  }, []);

  const handleSubmit = async () => {
    if (!agentId || !message.trim()) return;
    try {
      setLoading(true);
      const { data } = await api.post("/ai/playground", {
        agentId: Number(agentId),
        knowledgeBaseId: knowledgeBaseId ? Number(knowledgeBaseId) : undefined,
        message: message.trim()
      });
      setResult(data);
    } catch (err) {
      toastError(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>IA — Playground</Title>
      </MainHeader>

      <Paper style={{ padding: 16, marginBottom: 16 }}>
        <TextField
          select
          label="Agente"
          fullWidth
          margin="dense"
          value={agentId}
          onChange={e => setAgentId(e.target.value)}
          SelectProps={{ native: true }}
        >
          <option value="">Selecione</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </TextField>

        <TextField
          select
          label="Base de conhecimento (opcional)"
          fullWidth
          margin="dense"
          value={knowledgeBaseId}
          onChange={e => setKnowledgeBaseId(e.target.value)}
          SelectProps={{ native: true }}
        >
          <option value="">Todas vinculadas ao agente</option>
          {bases.map(base => (
            <option key={base.id} value={base.id}>
              {base.name}
            </option>
          ))}
        </TextField>

        <TextField
          label="Pergunta"
          fullWidth
          margin="dense"
          multiline
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
        />

        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            disabled={loading || !agentId || !message.trim()}
            onClick={handleSubmit}
          >
            {loading ? "Processando..." : "Enviar pergunta"}
          </Button>
        </Box>
      </Paper>

      {loading && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={28} />
        </Box>
      )}

      {result && (
        <>
          <Paper style={{ padding: 16, marginBottom: 16 }}>
            <Typography variant="h6" gutterBottom>
              Resposta
            </Typography>
            <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
              {result.response}
            </Typography>
            <Box mt={2} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
              <Chip label={`Modelo: ${result.model}`} />
              <Chip label={`Tokens in: ${result.tokensInput}`} />
              <Chip label={`Tokens out: ${result.tokensOutput}`} />
              <Chip label={`Custo ~$${result.estimatedCostUsd.toFixed(6)}`} />
              <Chip label={`Tempo: ${result.latencyMs}ms`} />
            </Box>
          </Paper>

          <Paper style={{ padding: 16 }}>
            <Typography variant="h6" gutterBottom>
              Chunks utilizados ({result.chunks?.length || 0})
            </Typography>
            <List dense>
              {(result.chunks || []).map(chunk => (
                <ListItem key={chunk.id} alignItems="flex-start">
                  <ListItemText
                    primary={`Similaridade: ${(chunk.similarity * 100).toFixed(1)}% — ${chunk.documentTitle || "Documento"}`}
                    secondary={chunk.content}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}
    </MainContainer>
  );
};

export default AiPlayground;
