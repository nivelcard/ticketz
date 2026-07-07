import { useTheme } from "@material-ui/core/styles";
import React, { useEffect, useState } from "react";
import CustomTooltip from "./CustomTooltip";

export function SmallPie({ chartData }) {
  const theme = useTheme();
  const [recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then(mod => {
      setRecharts(mod);
    });
  }, []);

  if (!recharts) {
    return <div style={{ width: "100px", height: "100px" }} />;
  }

  const { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } = recharts;

  return (
    <div style={{ width: "100px", height: "100px" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="95%"
            fill={theme.palette.primary.main}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={true} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
