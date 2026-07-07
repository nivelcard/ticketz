import React from "react";

import { Card } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import TicketHeaderSkeleton from "../TicketHeaderSkeleton";

const useStyles = makeStyles(theme => ({
  ticketHeader: {
    display: "flex",
    flex: "none",
    borderBottom: `1px solid ${theme.palette.borderPrimary}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "none"
  }
}));

const TicketHeader = ({ loading, children }) => {
  const classes = useStyles();

  return (
    <>
      {loading ? (
        <TicketHeaderSkeleton />
      ) : (
        <Card square className={classes.ticketHeader}>
          {children}
        </Card>
      )}
    </>
  );
};

export default TicketHeader;
