import { makeStyles, useTheme } from "@material-ui/core/styles";
import React, { useEffect, useState } from "react";
import CustomTooltip from "./CustomTooltip";

const useStyles = makeStyles(() => ({
  pieWrapper: {
    width: "100%",
    height: "100%"
  }
}));

export function SmallPie({ chartData }) {
  const theme = useTheme();
  const classes = useStyles();
  const [recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then(mod => {
      setRecharts(mod);
    });
  }, []);

  if (!recharts || !chartData?.length) {
    return <div className={classes.pieWrapper} />;
  }

  const { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } = recharts;

  const hasValues = chartData.some(d => d.value > 0);

  if (!hasValues) {
    return <div className={classes.pieWrapper} />;
  }

  return (
    <div className={classes.pieWrapper}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="92%"
            fill={theme.palette.primary.main}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={false} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
