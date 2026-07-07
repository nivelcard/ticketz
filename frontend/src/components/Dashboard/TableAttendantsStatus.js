import React, { useEffect, useState, useContext } from "react";

import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Skeleton from "@material-ui/lab/Skeleton";
import { SocketContext } from "../../context/Socket/SocketContext.js";

import { makeStyles } from "@material-ui/core/styles";
import { green, red } from "@material-ui/core/colors";

import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";

import Rating from "@material-ui/lab/Rating";
import { i18n } from "../../translate/i18n";
import { formatTimeInterval } from "../../helpers/formatTimeInterval.js";

const useStyles = makeStyles(theme => ({
  tableWrapper: {
    overflowX: "auto",
    ...theme.scrollbarStyles
  },
  tablePaper: {
    border: `1px solid ${theme.palette.borderPrimary}`,
    boxShadow: "none",
    borderRadius: theme.shape.borderRadius
  },
  on: {
    color: green[600],
    fontSize: "18px"
  },
  off: {
    color: red[600],
    fontSize: "18px"
  },
  pointer: {
    cursor: "pointer"
  },
  tableCell: {
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.6875rem",
      padding: theme.spacing(0.75, 1)
    }
  },
  tableHeadCell: {
    fontSize: "0.6875rem",
    whiteSpace: "nowrap",
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.625rem",
      padding: theme.spacing(0.75, 1)
    }
  }
}));

export function RatingBox({ rating }) {
  const ratingTrunc = rating === null ? 0 : Math.trunc(rating);
  return (
    <div style={{ width: "max-content" }}>
      <Rating defaultValue={ratingTrunc} max={5} readOnly />
      <span style={{ verticalAlign: "super" }}>
        &nbsp;({ratingTrunc?.toFixed(1)})
      </span>
    </div>
  );
}

export default function TableAttendantsStatus(props) {
  const { loading, attendants: loadedAttendants } = props;
  const classes = useStyles();
  const socketManager = useContext(SocketContext);
  const [attendants, setAttendants] = useState(loadedAttendants || []);

  const updateStatus = data => {
    const { userId, online } = data;
    setAttendants(prevAttendants =>
      prevAttendants.map(attendant =>
        attendant.id === userId ? { ...attendant, online } : attendant
      )
    );
  };

  useEffect(() => {
    if (loadedAttendants) {
      setAttendants(loadedAttendants);
    }
  }, [loadedAttendants]);

  useEffect(() => {
    const socket = socketManager.GetSocket();

    socket.on("userOnlineChange", updateStatus);

    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  function renderList() {
    return attendants.map(a => (
      <TableRow key={a.id}>
        <TableCell className={classes.tableCell}>{a.name}</TableCell>
        <TableCell align="center" className={classes.pointer}>
          <RatingBox rating={a.averageRating} />
        </TableCell>
        <TableCell align="center" className={classes.tableCell}>
          {a.totalTickets}
        </TableCell>
        <TableCell align="center" className={classes.tableCell}>
          {a.openTickets}
        </TableCell>
        <TableCell align="center" className={classes.tableCell}>
          {a.closedTickets}
        </TableCell>
        <TableCell align="center" className={classes.tableCell}>
          {formatTimeInterval(a.avgWaitTime, 2)}
        </TableCell>
        <TableCell align="center" className={classes.tableCell}>
          {formatTimeInterval(a.avgServiceTime, 2)}
        </TableCell>
        <TableCell align="center" className={classes.tableCell}>
          {a.online ? (
            <CheckCircleIcon className={classes.on} />
          ) : (
            <ErrorIcon className={classes.off} />
          )}
        </TableCell>
      </TableRow>
    ));
  }

  return !loading ? (
    <div className={classes.tableWrapper}>
      <TableContainer component={Paper} className={classes.tablePaper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("common.user")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("common.rating")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("dashboard.totalTickets")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("dashboard.ticketsOpen")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("dashboard.ticketsDone")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("dashboard.avgWaitTime")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("dashboard.avgServiceTime")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeadCell}>
                {i18n.t("dashboard.userCurrentStatus")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderList()}</TableBody>
        </Table>
      </TableContainer>
    </div>
  ) : (
    <Skeleton variant="rect" height={150} />
  );
}
