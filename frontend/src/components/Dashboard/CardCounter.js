import React from "react";

import { Avatar, Card, CardHeader, Typography } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";

import { makeStyles } from "@material-ui/core/styles";
import { grey } from "@material-ui/core/colors";

const useStyles = makeStyles(theme => ({
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: theme.palette.background.paper,
    width: theme.spacing(7),
    height: theme.spacing(7)
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: theme.palette.text.primary
  },
  cardSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "1.75rem",
    fontWeight: 700,
    lineHeight: 1.2
  },
  card: {
    borderRadius: theme.shape.borderRadius,
    boxShadow:
      theme.mode === "light"
        ? "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)"
        : "none",
    border: `1px solid ${theme.palette.divider}`,
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    "&:hover": {
      boxShadow:
        theme.mode === "light" ? "0 4px 12px rgba(15, 23, 42, 0.1)" : "none"
    }
  }
}));

export default function CardCounter(props) {
  const { icon, title, value, loading } = props;
  const classes = useStyles();
  return !loading ? (
    <Card className={classes.card}>
      <CardHeader
        avatar={<Avatar className={classes.cardAvatar}>{icon}</Avatar>}
        title={
          <Typography variant="h6" component="h2" className={classes.cardTitle}>
            {title}
          </Typography>
        }
        subheader={
          <Typography
            variant="subtitle1"
            component="p"
            className={classes.cardSubtitle}
          >
            {value}
          </Typography>
        }
      />
    </Card>
  ) : (
    <Skeleton variant="rect" height={80} />
  );
}
