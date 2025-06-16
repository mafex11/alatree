'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Users, CreditCard, Activity, UserPlus, Search, BarChart3 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

interface SystemStats {
  totalCredits: number;
  totalEvents: number;
  uniqueUsers: number;
  recentActivity: number;
  creditsByAction: Record<string, { totalCredits: number; eventCount: number }>;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [enrollResponse, setEnrollResponse] = useState<ApiResponse | null>(null);
  const [creditsResponse, setCreditsResponse] = useState<ApiResponse | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Form states
  const [enrollForm, setEnrollForm] = useState({
    userId: '',
    referrerId: '',
    creditsAwarded: 100,
    actionType: 'enrollment'
  });

  const [lookupForm, setLookupForm] = useState({
    userId: '',
    includeEvents: false,
    includeReferrals: false
  });

  const actionTypes = [
    { value: 'enrollment', label: 'Enrollment (20% referral bonus)', bonus: '20%' },
    { value: 'social_post', label: 'Social Post (10% referral bonus)', bonus: '10%' },
    { value: 'tech_module', label: 'Tech Module (15% referral bonus)', bonus: '15%' },
    { value: 'spend_multiplier', label: 'Spend Multiplier (25% referral bonus)', bonus: '25%' },
    { value: 'coffee_wall', label: 'Coffee Wall (5% referral bonus)', bonus: '5%' },
    { value: 'other', label: 'Other (10% referral bonus)', bonus: '10%' }
  ];

  // API call function
  const makeRequest = async (method: string, endpoint: string, data?: any): Promise<ApiResponse> => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  };

  // Handle enrollment
  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...enrollForm };
    if (!data.referrerId.trim()) {
      delete (data as any).referrerId;
    }
    
    const result = await makeRequest('POST', '/api/enroll', data);
    setEnrollResponse(result);
    
    if (result.success) {
      // Refresh stats
      loadSystemStats();
    }
  };

  // Handle credits lookup
  const handleCreditsLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      includeEvents: lookupForm.includeEvents.toString(),
      includeReferrals: lookupForm.includeReferrals.toString()
    });
    
    const result = await makeRequest('GET', `/api/credits/${lookupForm.userId}?${params}`);
    setCreditsResponse(result);
  };

  // Load system stats
  const loadSystemStats = async () => {
    const result = await makeRequest('GET', '/api/credits/system/stats');
    if (result.success) {
      setSystemStats({
        totalCredits: result.totalCredits || 0,
        totalEvents: result.totalEvents || 0,
        uniqueUsers: result.uniqueUsers || 0,
        recentActivity: result.recentActivity || 0,
        creditsByAction: result.creditsByAction || {}
      });
    }
  };

  // Quick test functions
  const quickTest1 = async () => {
    const randomId = 'testuser_' + Math.random().toString(36).substr(2, 9);
    const data = { userId: randomId, creditsAwarded: 100, actionType: 'enrollment' };
    const result = await makeRequest('POST', '/api/enroll', data);
    setEnrollResponse(result);
    setEnrollForm({ ...enrollForm, userId: randomId });
    if (result.success) loadSystemStats();
  };

  const quickTest2 = async () => {
    // Create referrer first
    const referrerId = 'referrer_' + Math.random().toString(36).substr(2, 9);
    await makeRequest('POST', '/api/enroll', {
      userId: referrerId,
      creditsAwarded: 100,
      actionType: 'enrollment'
    });

    // Create referred user
    const userId = 'referred_' + Math.random().toString(36).substr(2, 9);
    const result = await makeRequest('POST', '/api/enroll', {
      userId,
      referrerId,
      creditsAwarded: 150,
      actionType: 'enrollment'
    });
    
    setEnrollResponse(result);
    
    // Show referrer credits
    setTimeout(async () => {
      const creditsResult = await makeRequest('GET', `/api/credits/${referrerId}?includeReferrals=true`);
      setCreditsResponse(creditsResult);
      setLookupForm({ ...lookupForm, userId: referrerId, includeReferrals: true });
    }, 1000);
    
    if (result.success) loadSystemStats();
  };

  const quickTest3 = async () => {
    const randomId = 'social_' + Math.random().toString(36).substr(2, 9);
    const data = { userId: randomId, creditsAwarded: 50, actionType: 'social_post' };
    const result = await makeRequest('POST', '/api/enroll', data);
    setEnrollResponse(result);
    setEnrollForm({ ...enrollForm, userId: randomId, creditsAwarded: 50, actionType: 'social_post' });
    if (result.success) loadSystemStats();
  };

  const clearResults = () => {
    setEnrollResponse(null);
    setCreditsResponse(null);
    setEnrollForm({ userId: '', referrerId: '', creditsAwarded: 100, actionType: 'enrollment' });
    setLookupForm({ userId: '', includeEvents: false, includeReferrals: false });
  };

  // Load initial stats
  useEffect(() => {
    loadSystemStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 Credit Engine Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Test and manage your credit awarding and referral system
          </p>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{systemStats.totalCredits.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{systemStats.totalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{systemStats.uniqueUsers.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{systemStats.recentActivity.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="enroll" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="enroll" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Enroll
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Lookup
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-2">
              ⚡ Quick Tests
            </TabsTrigger>
          </TabsList>

          {/* Enrollment Tab */}
          <TabsContent value="enroll">
            <Card>
              <CardHeader>
                <CardTitle>User Enrollment</CardTitle>
                <CardDescription>Enroll users and award credits with optional referral bonuses</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEnroll} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userId">User ID *</Label>
                      <Input
                        id="userId"
                        placeholder="e.g., user123"
                        value={enrollForm.userId}
                        onChange={(e) => setEnrollForm({ ...enrollForm, userId: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="referrerId">Referrer ID (optional)</Label>
                      <Input
                        id="referrerId"
                        placeholder="e.g., referrer456"
                        value={enrollForm.referrerId}
                        onChange={(e) => setEnrollForm({ ...enrollForm, referrerId: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="creditsAwarded">Credits to Award</Label>
                      <Input
                        id="creditsAwarded"
                        type="number"
                        min="1"
                        value={enrollForm.creditsAwarded}
                        onChange={(e) => setEnrollForm({ ...enrollForm, creditsAwarded: parseInt(e.target.value) })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="actionType">Action Type</Label>
                      <Select
                        value={enrollForm.actionType}
                        onValueChange={(value) => setEnrollForm({ ...enrollForm, actionType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center justify-between w-full">
                                <span>{type.label}</span>
                                <Badge variant="secondary" className="ml-2">{type.bonus}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    🚀 Enroll User
                  </Button>
                </form>

                {enrollResponse && (
                  <Alert className={`mt-4 ${enrollResponse.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <AlertDescription>
                      <pre className="whitespace-pre-wrap text-sm">
                        {JSON.stringify(enrollResponse, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Lookup Tab */}
          <TabsContent value="lookup">
            <Card>
              <CardHeader>
                <CardTitle>User Credits Lookup</CardTitle>
                <CardDescription>Look up credit totals and history for any user</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreditsLookup} className="space-y-4">
                  <div>
                    <Label htmlFor="lookupUserId">User ID *</Label>
                    <Input
                      id="lookupUserId"
                      placeholder="e.g., user123"
                      value={lookupForm.userId}
                      onChange={(e) => setLookupForm({ ...lookupForm, userId: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeEvents"
                        checked={lookupForm.includeEvents}
                        onCheckedChange={(checked) => setLookupForm({ ...lookupForm, includeEvents: !!checked })}
                      />
                      <Label htmlFor="includeEvents">Include Event History</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeReferrals"
                        checked={lookupForm.includeReferrals}
                        onCheckedChange={(checked) => setLookupForm({ ...lookupForm, includeReferrals: !!checked })}
                      />
                      <Label htmlFor="includeReferrals">Include Referral Data</Label>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    🔍 Get Credits
                  </Button>
                </form>

                {creditsResponse && (
                  <Alert className={`mt-4 ${creditsResponse.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <AlertDescription>
                      <pre className="whitespace-pre-wrap text-sm">
                        {JSON.stringify(creditsResponse, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>System Statistics</CardTitle>
                <CardDescription>Real-time system performance and usage metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={loadSystemStats} disabled={loading} className="mb-4">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  📈 Refresh Stats
                </Button>

                {systemStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">Credits by Action Type</h3>
                        {Object.entries(systemStats.creditsByAction).map(([action, data]) => (
                          <div key={action} className="flex justify-between py-1">
                            <span className="capitalize">{action.replace('_', ' ')}</span>
                            <div className="text-right">
                              <div className="font-semibold">{data.totalCredits} credits</div>
                              <div className="text-xs text-gray-600">{data.eventCount} events</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h3 className="font-semibold text-green-900 mb-2">System Overview</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Credits:</span>
                            <span className="font-semibold">{systemStats.totalCredits.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Events:</span>
                            <span className="font-semibold">{systemStats.totalEvents.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Unique Users:</span>
                            <span className="font-semibold">{systemStats.uniqueUsers.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recent Activity:</span>
                            <span className="font-semibold">{systemStats.recentActivity.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Tests Tab */}
          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle>Quick Tests</CardTitle>
                <CardDescription>Run predefined tests to quickly verify system functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button onClick={quickTest1} disabled={loading} variant="outline">
                    👤 Create Test User
                  </Button>
                  <Button onClick={quickTest2} disabled={loading} variant="outline">
                    🔗 Test Referral Chain
                  </Button>
                  <Button onClick={quickTest3} disabled={loading} variant="outline">
                    📱 Social Media Action
                  </Button>
                  <Button onClick={clearResults} variant="destructive" disabled={loading}>
                    🗑️ Clear Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 