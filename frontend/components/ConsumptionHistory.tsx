import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Client } from "~backend/client";
import type { ConsumptionEntry } from "~backend/item/get_consumption_history";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConsumptionHistoryProps {
  itemId: number;
  backend: Client;
}

interface ChartDataPoint {
  date: string;
  quantity: number;
  timestamp: number;
}

export function ConsumptionHistory({ itemId, backend }: ConsumptionHistoryProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [reorderPoint, setReorderPoint] = useState<number | null>(null);
  const [averageConsumptionRate, setAverageConsumptionRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsumptionHistory();
  }, [itemId]);

  const loadConsumptionHistory = async () => {
    try {
      setLoading(true);
      const response = await backend.item.getConsumptionHistory({ itemId });

      const data: ChartDataPoint[] = [];
      
      if (response.history.length === 0) {
        setChartData([]);
        setReorderPoint(null);
        setAverageConsumptionRate(null);
        setLoading(false);
        return;
      }

      const firstEntry = response.history[0];
      const firstDate = new Date(firstEntry.recordedAt);
      
      data.push({
        date: firstDate.toLocaleDateString(),
        quantity: response.initialQuantity,
        timestamp: firstDate.getTime(),
      });

      response.history.forEach((entry) => {
        const date = new Date(entry.recordedAt);
        data.push({
          date: date.toLocaleDateString(),
          quantity: entry.quantityRemaining,
          timestamp: date.getTime(),
        });
      });

      setChartData(data);

      if (response.history.length >= 2) {
        const totalConsumed = response.history.reduce((sum, entry) => sum + entry.consumedQuantity, 0);
        const firstTimestamp = new Date(response.history[0].recordedAt).getTime();
        const lastTimestamp = new Date(response.history[response.history.length - 1].recordedAt).getTime();
        const daysElapsed = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24);
        
        if (daysElapsed > 0) {
          const dailyRate = totalConsumed / daysElapsed;
          setAverageConsumptionRate(dailyRate);
          
          const daysToReorder = 7;
          const suggestedReorder = Math.ceil(dailyRate * daysToReorder);
          setReorderPoint(suggestedReorder);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to load consumption history:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading consumption history...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No consumption history yet. Record consumption to see trends.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[#111827] mb-3">Consumption History</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              label={{ value: "Quantity", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="quantity"
              stroke="#FACC15"
              strokeWidth={2}
              dot={{ fill: "#FACC15", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {reorderPoint !== null && averageConsumptionRate !== null && (
        <Alert className="border-[#FACC15] bg-[#FFFBEB]">
          <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
          <AlertTitle className="text-sm font-semibold text-[#111827]">
            Suggested Reorder Point
          </AlertTitle>
          <AlertDescription className="text-sm text-gray-600 mt-1">
            Based on your average use of {averageConsumptionRate.toFixed(1)} items per day, 
            you should reorder when you have {reorderPoint} or fewer items left. 
            This gives you about a week's supply.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
