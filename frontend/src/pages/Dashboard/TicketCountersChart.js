import { makeStyles, useTheme } from "@material-ui/core";
import ShowChartIcon from "@material-ui/icons/ShowChart";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";
import { i18n } from "../../translate/i18n";
import CustomTooltip from "./CustomTooltip";
import Title from "./Title";
import { getTimezoneOffset } from "../../helpers/getTimezoneOffset";
import { getISOStringWithTimezone } from "../../helpers/getISOStringWithTimezone";

function prepareChartData(emptyData, serie) {
  const ticketCreateData = JSON.parse(JSON.stringify(emptyData));
  serie.counters.forEach(item => {
    const date = new Date(item.time);
    const dateKey =
      serie.field === "day"
        ? getISOStringWithTimezone(date).split("T")[0]
        : getISOStringWithTimezone(date).split(".")[0];
    ticketCreateData[dateKey] = Number(item.counter);
  });
  return ticketCreateData;
}

const useStyles = makeStyles(theme => ({
  chartWrapper: {
    width: "100%",
    height: 280,
    minHeight: 200,
    [theme.breakpoints.down("xs")]: {
      height: 220,
      minHeight: 180
    }
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: 220,
    color: theme.palette.text.secondary,
    gap: theme.spacing(1)
  },
  emptyIcon: {
    fontSize: 36,
    opacity: 0.35
  },
  emptyText: {
    fontSize: "0.8125rem",
    textAlign: "center",
    maxWidth: 280
  },
  legend: {
    display: "flex",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1),
    flexWrap: "wrap"
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.75rem",
    color: theme.palette.text.secondary
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0
  }
}));

export function TicketCountersChart({ ticketCounters }) {
  const now = new Date();
  const tz = getTimezoneOffset();
  const theme = useTheme();
  const classes = useStyles();
  const t = (...params) => i18n.t(...params);

  const [chartData, setChartData] = useState([]);
  const [recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then(mod => {
      setRecharts(mod);
    });
  }, []);

  useEffect(() => {
    if (!ticketCounters?.create?.field) return;

    const field = ticketCounters.create.field;
    const step = {
      twelve_hours: 720,
      six_hours: 360,
      three_hours: 180,
      hour: 60,
      timestamp: 30
    };

    const startDate = new Date(ticketCounters.create.start);
    const endDate = new Date(ticketCounters.create.end);

    if (endDate > now) {
      endDate.setTime(now.getTime());
    }
    const xAxisEmptyData = {};

    if (field === "day") {
      let currentDate = new Date(startDate);
      while (currentDate < endDate) {
        xAxisEmptyData[getISOStringWithTimezone(currentDate).split("T")[0]] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      let currentDate = new Date(startDate);
      while (currentDate < endDate) {
        xAxisEmptyData[getISOStringWithTimezone(currentDate).split(".")[0]] = 0;
        currentDate.setMinutes(currentDate.getMinutes() + step[field]);
      }
    }

    const createData = prepareChartData(xAxisEmptyData, ticketCounters.create);
    const closeData = prepareChartData(xAxisEmptyData, ticketCounters.close);

    const nextChartData = Object.keys(createData).map(key => ({
      time: key,
      created: createData[key] || 0,
      closed: closeData[key] || 0
    }));

    setChartData(nextChartData);
  }, [ticketCounters]);

  const hasData =
    chartData.length > 0 && chartData.some(d => d.created > 0 || d.closed > 0);

  const createdColor = theme.palette.primary.main;
  const closedColor = theme.mode === "light" ? "#22C55E" : "#4ADE80";
  const tickFontSize = window.innerWidth < 600 ? 10 : 11;

  if (!recharts) {
    return (
      <React.Fragment>
        <Title>{t("dashboard.ticketsOnPeriod")}</Title>
        <div className={classes.chartWrapper} />
      </React.Fragment>
    );
  }

  const {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
  } = recharts;

  return (
    <React.Fragment>
      <Title>{t("dashboard.ticketsOnPeriod")}</Title>

      {hasData && (
        <div className={classes.legend}>
          <div className={classes.legendItem}>
            <span
              className={classes.legendDot}
              style={{ backgroundColor: createdColor }}
            />
            {t("dashboard.ticketCountersLabels.created")}
          </div>
          <div className={classes.legendItem}>
            <span
              className={classes.legendDot}
              style={{ backgroundColor: closedColor }}
            />
            {t("dashboard.ticketCountersLabels.closed")}
          </div>
        </div>
      )}

      {!hasData ? (
        <div className={classes.emptyState}>
          <ShowChartIcon className={classes.emptyIcon} />
          <Typography className={classes.emptyText}>
            {t("dashboard.noChartData")}
          </Typography>
        </div>
      ) : (
        <div className={classes.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 8,
                right: 8,
                bottom: 0,
                left: -12
              }}
            >
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={createdColor}
                    stopOpacity={0.25}
                  />
                  <stop offset="95%" stopColor={createdColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={closedColor}
                    stopOpacity={0.25}
                  />
                  <stop offset="95%" stopColor={closedColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey={({ time }) => {
                  if (time.includes("T")) {
                    const date = new Date(time);
                    if (
                      date.getDate() === now.getDate() &&
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear()
                    ) {
                      return date.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit"
                      });
                    }
                    if (
                      date.getDate() >= now.getDate() - 6 &&
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear()
                    ) {
                      return date
                        .toLocaleDateString(undefined, {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                        .replace(",", "");
                    }
                    if (date.getFullYear() === now.getFullYear()) {
                      return date
                        .toLocaleDateString(undefined, {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                        .replace(",", "");
                    }
                    return date
                      .toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                      .replace(",", "");
                  }
                  const date = new Date(`${time}T00:00:00${tz}`);
                  if (date.getFullYear() === now.getFullYear()) {
                    return date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "2-digit"
                    });
                  }
                  return date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit"
                  });
                }}
                tickLine={false}
                axisLine={false}
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: tickFontSize }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                type="number"
                allowDecimals={false}
                stroke={theme.palette.text.secondary}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: tickFontSize }}
                width={32}
              />
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke={theme.palette.borderPrimary}
                opacity={0.6}
              />
              <Tooltip
                content={
                  <CustomTooltip i18nBase="dashboard.ticketCountersLabels" />
                }
                cursor={{ stroke: theme.palette.borderPrimary }}
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke={createdColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="closed"
                stroke={closedColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorClosed)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </React.Fragment>
  );
}
