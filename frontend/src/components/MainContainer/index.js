import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const useStyles = makeStyles(theme => ({
  mainContainer: {
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(4),
    maxWidth: "100%"
  },

  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2)
  }
}));

const MainContainer = ({ children }) => {
  const classes = useStyles();

  return (
    <Container className={classes.mainContainer} maxWidth={false}>
      <div className={classes.contentWrapper}>{children}</div>
    </Container>
  );
};

export default MainContainer;
