import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Quotation } from "@/api/entities";
import { X, TrendingUp, Calendar, Euro, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function MonthlyValueChart({ onClose, monthlyValue }) {
  const [chartData, setChartData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    loadChartData();
  }, [selectedPeriod, customStartDate, customEndDate]);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      let startDate, endDate;
      
      switch (selectedPeriod) {
        case 'this_month':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case 'last_month':
          const lastMonth = subMonths(new Date(), 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) return;
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          break;
        default:
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
      }

      const allQuotes = await Quotation.list();
      const activeQuotes = allQuotes.filter(q => !q.is_deleted && !q.is_archived);
      
      // Filter quotes in the selected date range
      const quotesInRange = activeQuotes.filter(quote => {
        const quoteDate = parseISO(quote.created_date) || new Date(quote.created_date);
        return quoteDate >= startDate && quoteDate <= endDate;
      });

      // Generate all days in the range
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Group quotes by day and calculate totals
      const dailyData = allDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const quotesOnDay = quotesInRange.filter(quote => {
          const quoteDate = parseISO(quote.created_date) || new Date(quote.created_date);
          return format(quoteDate, 'yyyy-MM-dd') === dayStr;
        });
        
        const dayValue = quotesOnDay.reduce((sum, quote) => sum + (quote.total || quote.total_amount || 0), 0);
        
        return {
          date: dayStr,
          day: format(day, 'dd'),
          fullDate: format(day, 'MMM dd'),
          value: dayValue,
          count: quotesOnDay.length
        };
      });

      setChartData(dailyData);
      setTotalValue(dailyData.reduce((sum, day) => sum + day.value, 0));
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border clay-shadow">
          <p className="font-semibold text-slate-800">{data.fullDate}</p>
          <p className="text-green-600 font-bold">€{data.value.toLocaleString()}</p>
          <p className="text-sm text-slate-600">{data.count} quote{data.count !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Value (€)', 'Quote Count'];
    const csvContent = [
      headers.join(','),
      ...chartData.map(row => [
        row.fullDate,
        row.value.toFixed(2),
        row.count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `monthly_value_${selectedPeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="clay-shadow bg-white border-none rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              Monthly Value Trend
            </CardTitle>
            <p className="text-slate-600 mt-1">
              Daily breakdown of quotation values
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="clay-button rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="clay-inset bg-white/60 border-none rounded-xl w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-2">
                  <div>
                    <Label className="text-xs text-slate-600">From</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-xl h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">To</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-xl h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="clay-inset bg-white/60 border-none rounded-xl w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="clay-button bg-white/60 border-none rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="clay-inset bg-gradient-to-r from-green-50 to-green-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Total Value</p>
                    <p className="text-2xl font-bold text-green-800">€{totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="clay-inset bg-gradient-to-r from-blue-50 to-blue-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Days with Quotes</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {chartData.filter(d => d.count > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="clay-inset bg-gradient-to-r from-purple-50 to-purple-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Daily Average</p>
                    <p className="text-2xl font-bold text-purple-800">
                      €{chartData.length > 0 ? (totalValue / chartData.length).toFixed(0) : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="clay-inset bg-white/40 border-none rounded-2xl p-4">
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Loading chart data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="day" 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={12}
                        tickFormatter={(value) => `€${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="day" 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={12}
                        tickFormatter={(value) => `€${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}