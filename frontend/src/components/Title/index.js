import React from "react";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  title: {
    fontWeight: 600,
    fontSize: "1.125rem",
    letterSpacing: "-0.01em",
    color: theme.palette.text.primary
  }
}));

export default function Title(props) {
  const classes = useStyles();

  return (
    <Typography className={classes.title} gutterBottom>
      {props.children}
    </Typography>
  );
}
