"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    RefreshCcw,
    ArrowLeftRight,
    User,
    Building,
    FileText,
    AlertCircle
} from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ReturnsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Returns & Reversals</h1>
                    <p className="text-muted-foreground">Process sales returns (Credit Notes) and purchase returns (Debit Notes).</p>
                </div>
            </div>

            <Tabs defaultValue="sales" className="space-y-6">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="sales">Sales Returns</TabsTrigger>
                    <TabsTrigger value="purchase">Purchase Returns</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Invoice No. or Party Name..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="secondary">Find Transaction</Button>
                </div>

                <TabsContent value="sales">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg font-bold flex items-center">
                                <RefreshCcw className="mr-2 h-5 w-5 text-blue-600" />
                                Initiate Sales Return (Credit Note)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-10 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>Enter an invoice number above to load items for return.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recently Processed Returns Table */}
                    <div className="mt-8 space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Credit Notes</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return ID</TableHead>
                                    <TableHead>Original Invoice</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="text-right">Return Value</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-mono text-xs">CN-2026-0042</TableCell>
                                    <TableCell className="font-mono text-xs">PF-100245</TableCell>
                                    <TableCell>Vikas Pharmacy</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">₹2,450.00</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Stock Updated</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="purchase">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg font-bold flex items-center">
                                <ArrowLeftRight className="mr-2 h-5 w-5 text-orange-600" />
                                Initiate Purchase Return (Debit Note)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-10 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>Enter a purchase bill number above to load items for return.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
