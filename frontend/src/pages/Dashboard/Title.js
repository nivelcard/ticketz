import React from "react";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  title: {
    fontWeight: 600,
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      fontSize: "0.8125rem"
    }
  }
}));

const Title = props => {
  const classes = useStyles();

  return (
    <Typography component="h2" className={classes.title}>
      {props.children}
    </Typography>
  );
};

export default Title;
