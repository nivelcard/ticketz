import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import brandTokens from "../../theme/brandTokens";

const useStyles = makeStyles(theme => ({
  mainContainer: {
    flex: 1,
    padding: theme.spacing(2),
    height: `calc(100% - ${brandTokens.layout.appBarHeight}px)`,
    backgroundColor: theme.palette.background.default
  },

  contentWrapper: {
    height: "100%",
    overflowY: "hidden",
    display: "flex",
    flexDirection: "column"
  }
}));

const MainContainer = ({ children }) => {
  const classes = useStyles();

  return (
    <Container className={classes.mainContainer}>
      <div className={classes.contentWrapper}>{children}</div>
    </Container>
  );
};

export default MainContainer;
