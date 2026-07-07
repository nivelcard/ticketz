import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box
} from "@material-ui/core";
import { useHistory } from "react-router-dom";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const AiSetupWizard = () => {
  const history = useHistory();
  const [setup, setSetup] = useState(null);
  const [creatingDemo, setCreatingDemo] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/ai/setup/status");
      setSetup(data);
    } catch (_err) {
      setSetup(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateDemo = async () => {
    try {
      setCreatingDemo(true);
      await api.post("/ai/setup/demo");
      toast.success("Ambiente de demonstração criado");
      await load();
    } catch (err) {
      toastError(err);
    } finally {
      setCreatingDemo(false);
    }
  };

  if (!setup?.showWizard && !setup?.offerDemo) {
    return null;
  }

  return (
    <Paper style={{ padding: 16, marginBottom: 16 }}>
      <Typography variant="h6" gutterBottom>
        Assistente de configuração da IA
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Progresso: {setup.completedSteps}/{setup.totalSteps} etapas
      </Typography>

      {setup.offerDemo && (
        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Nenhuma base de conhecimento encontrada. Deseja criar um ambiente de
            demonstração inicial?
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            disabled={creatingDemo}
            onClick={handleCreateDemo}
          >
            {creatingDemo
              ? "Criando..."
              : "Criar ambiente de demonstração (Teste)"}
          </Button>
        </Box>
      )}

      <Stepper activeStep={setup.completedSteps} orientation="vertical">
        {setup.steps.map(step => (
          <Step key={step.key} completed={step.completed}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              {step.description && (
                <Typography variant="body2" color="textSecondary">
                  {step.description}
                </Typography>
              )}
              {step.href && !step.completed && (
                <Button
                  size="small"
                  color="primary"
                  onClick={() => history.push(step.href)}
                >
                  Ir para etapa
                </Button>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {setup.completedSteps >= 5 && (
        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => history.push("/ai/playground")}
          >
            Executar teste no Playground
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default AiSetupWizard;
