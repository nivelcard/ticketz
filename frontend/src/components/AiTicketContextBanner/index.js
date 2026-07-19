import React from "react";
import { Box, Typography, makeStyles } from "@material-ui/core";
import WarningIcon from "@material-ui/icons/Warning";
import { i18n } from "../../translate/i18n";
import {
  getHandoffReasonLabel,
  isHandoffPendingTicket,
  isAiHandlingTicket,
  formatConfidencePercent,
  getPriorityBadge
} from "../../helpers/aiTicketStatus";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.type === "dark" ? "#3e2723" : "#fff3e0"
  },
  handoffRoot: {
    backgroundColor: theme.palette.type === "dark" ? "#4a1515" : "#ffebee",
    borderLeft: "4px solid #c62828"
  },
  aiRoot: {
    backgroundColor: theme.palette.type === "dark" ? "#311b92" : "#ede7f6",
    borderLeft: "4px solid #6a1b9a"
  },
  title: {
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75)
  },
  line: {
    marginTop: theme.spacing(0.5),
    fontSize: "0.875rem"
  },
  observationRoot: {
    backgroundColor: theme.palette.type === "dark" ? "#1b2838" : "#e3f2fd",
    borderLeft: "4px solid #1565c0"
  },
  summary: {
    marginTop: theme.spacing(1),
    whiteSpace: "pre-line",
    fontSize: "0.875rem"
  }
}));

const AiTicketContextBanner = ({ ticket, observationMode = false }) => {
  const classes = useStyles();

  const renderContextDetails = () => {
    if (!ticket?.aiAgentId && !ticket?.aiHandoff && !ticket?.aiStartedAt) {
      return null;
    }

    const handoffPending = isHandoffPendingTicket(ticket);
    const aiHandling = isAiHandlingTicket(ticket);
    const reasonLabel = getHandoffReasonLabel(ticket.aiHandoffReason);
    const priorityBadge = getPriorityBadge(ticket.aiPriority);

    if (handoffPending || (ticket.aiHandoff && !ticket.userId)) {
      return (
        <Box className={`${classes.root} ${classes.handoffRoot}`}>
          <Typography className={classes.title} color="error">
            <WarningIcon fontSize="small" />
            {i18n.t("aiSupervision.banner.handoffTitle")}
          </Typography>
          {ticket.aiHandoffSummary && (
            <Typography className={classes.summary}>
              {ticket.aiHandoffSummary}
            </Typography>
          )}
          <Typography className={classes.line}>
            {i18n.t("aiSupervision.banner.startedByAi")}
          </Typography>
          {reasonLabel &&
            ticket.aiHandoffReason !== "manual_takeover" &&
            !ticket.aiHandoffSummary?.includes(reasonLabel) && (
              <Typography className={classes.line}>
                {i18n.t("aiSupervision.banner.handoffReason")}: {reasonLabel}
              </Typography>
            )}
          {ticket.aiHandoffReason === "low_confidence" &&
            ticket.aiLastConfidence !== null &&
            ticket.aiLastConfidence !== undefined && (
              <Typography className={classes.line}>
                {i18n.t("aiSupervision.banner.lowConfidence")}:{" "}
                {formatConfidencePercent(ticket.aiLastConfidence)}
              </Typography>
            )}
          {priorityBadge && (
            <Typography className={classes.line}>
              {i18n.t("aiSupervision.banner.priority")}: {priorityBadge.label}
            </Typography>
          )}
          {ticket.queue?.name && (
            <Typography className={classes.line}>
              {i18n.t("aiSupervision.banner.queue")}: {ticket.queue.name}
            </Typography>
          )}
          <Typography className={classes.line}>
            {i18n.t("aiSupervision.banner.reviewHistory")}
          </Typography>
        </Box>
      );
    }

    if (aiHandling) {
      return (
        <Box className={`${classes.root} ${classes.aiRoot}`}>
          <Typography className={classes.title}>
            {i18n.t("aiSupervision.banner.aiHandlingTitle")}
          </Typography>
          <Typography className={classes.line}>
            {i18n.t("aiSupervision.banner.aiHandlingHint")}
          </Typography>
          {ticket.aiLastConfidence !== null &&
            ticket.aiLastConfidence !== undefined && (
              <Typography className={classes.line}>
                {i18n.t("aiSupervision.banner.confidence")}:{" "}
                {formatConfidencePercent(ticket.aiLastConfidence)}
              </Typography>
            )}
        </Box>
      );
    }

    return null;
  };

  const contextDetails = renderContextDetails();

  if (!observationMode && !contextDetails) {
    return null;
  }

  return (
    <>
      {observationMode && (
        <Box className={`${classes.root} ${classes.observationRoot}`}>
          <Typography className={classes.title}>
            {i18n.t("aiSupervision.banner.observationTitle")}
          </Typography>
          <Typography className={classes.line}>
            {i18n.t("aiSupervision.banner.observationHint")}
          </Typography>
        </Box>
      )}
      {contextDetails}
    </>
  );
};

export default AiTicketContextBanner;
