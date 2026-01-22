"use client";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    TrendingUp,
    AlertOctagon,
    PieChart,
    FileText,
    Calendar,
    ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Business Reports</h1>
                    <p className="text-muted-foreground">Financial analytics and inventory forecasting.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Last 30 Days</Button>
                    <Button><FileDown className="mr-2 h-4 w-4" /> Export PDF</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">GSTR-1 Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹12.45L</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">GST Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹1.50L</div>
                        <p className="text-xs text-muted-foreground mt-1">Total CGST + SGST</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Expiry Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹45k</div>
                        <div className="text-xs text-red-500 flex items-center mt-1">
                            <AlertOctagon className="h-3 w-3 mr-1" /> 12 Batches in next 90 days
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹2.80L</div>
                        <div className="text-xs text-blue-600 mt-1">22.5% Average Margin</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="gst" className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="gst" className="data-[state=active]:bg-background">GST Returns</TabsTrigger>
                    <TabsTrigger value="expiry" className="data-[state=active]:bg-background">Expiry Forecast</TabsTrigger>
                    <TabsTrigger value="sales" className="data-[state=active]:bg-background">Sales Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="gst">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Monthly GST Summary (GSTR-1)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>GST Rate</TableHead>
                                        <TableHead className="text-right">Taxable Amount</TableHead>
                                        <TableHead className="text-right">CGST</TableHead>
                                        <TableHead className="text-right">SGST</TableHead>
                                        <TableHead className="text-right">IGST</TableHead>
                                        <TableHead className="text-right font-bold text-primary">Total Tax</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>GST 12%</TableCell>
                                        <TableCell className="text-right font-mono">₹5,00,000</TableCell>
                                        <TableCell className="text-right font-mono">₹30,000</TableCell>
                                        <TableCell className="text-right font-mono">₹30,000</TableCell>
                                        <TableCell className="text-right font-mono">₹0</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-primary">₹60,000</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>GST 18%</TableCell>
                                        <TableCell className="text-right font-mono">₹4,00,000</TableCell>
                                        <TableCell className="text-right font-mono">₹36,000</TableCell>
                                        <TableCell className="text-right font-mono">₹36,000</TableCell>
                                        <TableCell className="text-right font-mono">₹0</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-primary">₹72,000</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expiry">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium font-bold text-red-600">Critical Expiry Alerts (Next 90 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                        <TableHead className="text-right">Remaining Stock</TableHead>
                                        <TableHead className="text-right">Stock Value</TableHead>
                                        <TableHead className="w-[150px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Vicks Action 500</TableCell>
                                        <TableCell className="font-mono text-xs uppercase">BT-00923</TableCell>
                                        <TableCell className="text-red-500 font-semibold">Feb 15, 2026</TableCell>
                                        <TableCell className="text-right font-bold text-red-600">450 Strips</TableCell>
                                        <TableCell className="text-right font-mono">₹12,600</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="text-primary">
                                                Return to Supplier <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FileDown(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    )
}
