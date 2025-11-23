import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Brain,
  TrendingUp, Users, Activity, Zap, Clock, Target
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar, Cell, Area, AreaChart
} from "recharts";
import {
  analyticsApi, MLHealthResponse, MLTrainResponse, MLPredictResponse,
  MLForecastResponse, EmployeeRisk, FeatureImportance, ForecastPoint
} from "@/services/api/analyticsApi";
import { format, subMonths, startOfYear } from "date-fns";

interface PredictiveAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function PredictiveAnalytics({ selectedDate, dateRange }: PredictiveAnalyticsProps) {
  // State
  const [health, setHealth] = useState<MLHealthResponse | null>(null);
  const [trainResult, setTrainResult] = useState<MLTrainResponse | null>(null);
  const [predictions, setPredictions] = useState<MLPredictResponse | null>(null);
  const [forecast, setForecast] = useState<MLForecastResponse | null>(null);

  const [loading, setLoading] = useState({ health: true, train: false, predict: false, forecast: false });
  const [error, setError] = useState<string | null>(null);

  // Date range for queries
  const startDate = dateRange?.from
    ? format(dateRange.from, 'yyyy-MM-dd')
    : '2024-01-01';
  const endDate = dateRange?.to
    ? format(dateRange.to, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  // Check ML service health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (health?.status === 'healthy' && health?.model_trained) {
      // ✅ Auto-fetch predictions when model is trained
      fetchPredictions();
      if (health.prophet_available) {
        fetchForecast();
      }
    }
  }, [health?.model_trained, startDate, endDate]);

  const checkHealth = async () => {
    setLoading(prev => ({ ...prev, health: true }));
    try {
      const result = await analyticsApi.checkMLHealth();
      setHealth(result);
      setError(null);
    } catch (e) {
      setHealth({ status: 'unavailable', model_trained: false, last_trained: null, prophet_available: false });
      setError('ML service unavailable. Make sure the Python ML service is running.');
    } finally {
      setLoading(prev => ({ ...prev, health: false }));
    }
  };

  const trainModel = async () => {
    setLoading(prev => ({ ...prev, train: true }));
    setError(null);
    try {
      const result = await analyticsApi.trainMLModel(startDate, endDate);
      setTrainResult(result);
      if (result.success) {
        await checkHealth();
      }
    } catch (e: any) {
      setError(e.message || 'Training failed');
    } finally {
      setLoading(prev => ({ ...prev, train: false }));
    }
  };

  const fetchPredictions = async () => {
    setLoading(prev => ({ ...prev, predict: true }));
    try {
      const result = await analyticsApi.getMLPredictions(startDate, endDate, 10);
      setPredictions(result);
    } catch (e: any) {
      console.error('Predictions failed:', e);
    } finally {
      setLoading(prev => ({ ...prev, predict: false }));
    }
  };

  const fetchForecast = async () => {
    setLoading(prev => ({ ...prev, forecast: true }));
    try {
      const result = await analyticsApi.getMLForecast(startDate, endDate, 4);
      setForecast(result);
    } catch (e: any) {
      console.error('Forecast failed:', e);
    } finally {
      setLoading(prev => ({ ...prev, forecast: false }));
    }
  };

  const getRiskBadge = (score: number) => {
    if (score > 0.5) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 0.3) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge className="bg-green-500">Low Risk</Badge>;
  };

  const getStatusIcon = () => {
    if (loading.health) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (health?.status === 'healthy') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Service Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>ML Predictive Analytics</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {health?.status === 'healthy' ? 'Service Active' : 'Service Unavailable'}
              </span>
            </div>
          </div>
          <CardDescription>
            Logistic Regression for risk scoring + Prophet for trend forecasting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Model:</span>
              {health?.model_trained ? (
                <Badge className="bg-green-500">Trained</Badge>
              ) : (
                <Badge variant="secondary">Not Trained</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Prophet:</span>
              {health?.prophet_available ? (
                <Badge className="bg-blue-500">Available</Badge>
              ) : (
                <Badge variant="secondary">Unavailable</Badge>
              )}
            </div>
            {health?.last_trained && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Last trained: {new Date(health.last_trained).toLocaleString()}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={checkHealth} disabled={loading.health}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading.health ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={trainModel} disabled={loading.train || health?.status !== 'healthy'}>
                <Zap className={`h-4 w-4 mr-1 ${loading.train ? 'animate-pulse' : ''}`} />
                {loading.train ? 'Training...' : 'Train Model'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Training Results */}
      {trainResult?.success && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Model Training Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {trainResult.metrics.train_accuracy}%
                </p>
                <p className="text-xs text-muted-foreground">Train Accuracy</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {trainResult.metrics.test_accuracy}%
                </p>
                <p className="text-xs text-muted-foreground">Test Accuracy</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold">
                  {trainResult.metrics.total_records.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold">
                  {trainResult.metrics.unique_employees}
                </p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
            </div>

            {/* Feature Importance */}
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium mb-2">Feature Importance (Risk Drivers)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trainResult.feature_importance}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="feature" type="category" width={110} />
                    <Tooltip />
                    <Bar dataKey="coefficient" name="Impact">
                      {trainResult.feature_importance.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.coefficient > 0 ? '#ef4444' : '#22c55e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      {health?.model_trained && (
        <Tabs defaultValue="predictions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Risk Predictions
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2" disabled={!health.prophet_available}>
              <TrendingUp className="h-4 w-4" />
              Absence Forecast
            </TabsTrigger>
          </TabsList>

          {/* Risk Predictions Tab */}
          <TabsContent value="predictions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top 10 High-Risk Employees
                </CardTitle>
                <CardDescription>
                  Employees most likely to have attendance issues based on historical patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Risk Summary */}
                {predictions && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-3xl font-bold text-red-600">{predictions.high_risk_count}</p>
                      <p className="text-sm text-red-700">High Risk (&gt;50%)</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-3xl font-bold text-yellow-600">{predictions.medium_risk_count}</p>
                      <p className="text-sm text-yellow-700">Medium (30-50%)</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-3xl font-bold text-green-600">{predictions.low_risk_count}</p>
                      <p className="text-sm text-green-700">Low Risk (&lt;30%)</p>
                    </div>
                  </div>
                )}

                {/* Employee Table */}
                {loading.predict ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading predictions...</p>
                  </div>
                ) : predictions?.employees && predictions.employees.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-center">Risk Score</TableHead>
                          <TableHead className="text-right">Avg Late (30D)</TableHead>
                          <TableHead className="text-right">OT (90D)</TableHead>
                          <TableHead className="text-right">Absences (60D)</TableHead>
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {predictions.employees.map((emp, idx) => (
                          <TableRow key={emp.staff_user_id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.staff_id}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{emp.department}</TableCell>
                            <TableCell>{emp.role}</TableCell>
                            <TableCell className="text-center">
                              {getRiskBadge(emp.risk_score)}
                              <p className="text-xs mt-1">{(emp.risk_score * 100).toFixed(1)}%</p>
                            </TableCell>
                            <TableCell className="text-right">{emp.avg_late_30d.toFixed(1)} min</TableCell>
                            <TableCell className="text-right">{emp.total_ot_90d.toFixed(1)} hrs</TableCell>
                            <TableCell className="text-right">{emp.absence_count_60d}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {emp.recommendation.split(' | ').map((rec, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {rec}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No prediction data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  4-Week Absence Rate Forecast
                </CardTitle>
                <CardDescription>
                  Prophet time-series prediction with 95% confidence interval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading.forecast ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Generating forecast...</p>
                  </div>
                ) : forecast?.forecast && forecast.forecast.length > 0 ? (
                  <>
                    {/* Historical Average */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">Historical Average Absence Rate</p>
                      <p className="text-2xl font-bold text-blue-600">{forecast.historical_avg}%</p>
                    </div>

                    {/* Forecast Chart */}
                    <div className="h-72 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            // ✅ Combine historical + forecast data
                            ...(forecast.historical || []).map(h => ({
                              week_starting: h.week_starting,
                              predicted_rate: h.predicted_rate,
                              type: 'historical'
                            })),
                            ...forecast.forecast.map(f => ({
                              week_starting: f.week_starting,
                              predicted_rate: f.predicted_rate,
                              lower_bound: f.lower_bound,
                              upper_bound: f.upper_bound,
                              type: 'forecast'
                            }))
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="week_starting"
                            tickFormatter={(val) => format(new Date(val), 'MMM d')}
                          />
                          <YAxis
                            domain={[0, 'auto']}
                            tickFormatter={(val) => `${val}%`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;

                              const data = payload[0].payload;
                              const isHistorical = data.type === 'historical';

                              return (
                                <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                  <p className="font-semibold mb-1">
                                    {format(new Date(data.week_starting), 'MMM d, yyyy')}
                                  </p>
                                  <p className={`text-sm ${isHistorical ? 'text-blue-600' : 'text-red-600'}`}>
                                    {isHistorical ? 'Historical' : 'Forecast'}: {data.predicted_rate?.toFixed(1)}%
                                  </p>
                                  {!isHistorical && data.lower_bound !== undefined && (
                                    <>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Lower (95%): {data.lower_bound?.toFixed(1)}%
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Upper (95%): {data.upper_bound?.toFixed(1)}%
                                      </p>
                                    </>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Legend />

                          {/* ✅ Historical Line (BLUE) */}
                          <Line
                            type="monotone"
                            dataKey={(entry: any) => entry.type === 'historical' ? entry.predicted_rate : null}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            connectNulls={false}
                            name="Historical Rate"
                          />

                          {/* ✅ Forecast Line (RED) */}
                          <Line
                            type="monotone"
                            dataKey={(entry: any) => entry.type === 'forecast' ? entry.predicted_rate : null}
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#ef4444', r: 4 }}
                            connectNulls={false}
                            name="Forecast Rate"
                          />

                          {/* ✅ Confidence Bands (PINK) - Only for forecast */}
                          <Line
                            type="monotone"
                            dataKey={(entry: any) => entry.type === 'forecast' ? entry.upper_bound : null}
                            stroke="#22c55e"
                            strokeWidth={1}
                            dot={false}
                            connectNulls={false}
                            name="Upper Bound (95%)"
                          />
                          <Line
                            type="monotone"
                            dataKey={(entry: any) => entry.type === 'forecast' ? entry.lower_bound : null}
                            stroke="#f97316"
                            strokeWidth={1}
                            dot={false}
                            connectNulls={false}
                            name="Lower Bound (95%)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Forecast Table */}
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Week Starting</TableHead>
                            <TableHead className="text-center">Predicted Rate</TableHead>
                            <TableHead className="text-center">Lower Bound (95%)</TableHead>
                            <TableHead className="text-center">Upper Bound (95%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {forecast.forecast.map((point, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {format(new Date(point.week_starting), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-center font-bold text-red-600">
                                {point.predicted_rate.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {point.lower_bound.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {point.upper_bound.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {!health?.prophet_available
                      ? 'Prophet not available. Install prophet package in Python service.'
                      : 'No forecast data available. Train the model first.'
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Instructions when not trained */}
      {!health?.model_trained && health?.status === 'healthy' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Brain className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Ready to Train</h3>
              <p className="text-blue-600 mb-4">
                Click "Train Model" to analyze your attendance data and generate predictions.
              </p>
              <p className="text-sm text-blue-500">
                The model will use data from {startDate} to {endDate}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service unavailable message */}
      {health?.status !== 'healthy' && !loading.health && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">ML Service Unavailable</h3>
              <p className="text-red-600 mb-4">
                The Python ML service is not running. Please start it to enable predictions.
              </p>
              <div className="text-left max-w-md mx-auto bg-white p-4 rounded-lg text-sm font-mono">
                <p className="text-gray-600 mb-2"># Start the ML service:</p>
                <p>cd server/python-ml</p>
                <p>python main.py</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}