import React from "react";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  contactsHeader: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1, 0, 1.5, 0),
    borderBottom: `1px solid ${theme.palette.borderPrimary}`,
    marginBottom: theme.spacing(1)
  }
}));

const MainHeader = ({ children }) => {
  const classes = useStyles();

  return <div className={classes.contactsHeader}>{children}</div>;
};

export default MainHeader;
