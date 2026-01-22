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
    Filter,
    AlertTriangle,
    ArrowUpDown,
    Edit2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StockPage() {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stock Inventory</h1>
                    <p className="text-muted-foreground">View and manage all pharmaceutical batches.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Export Report</Button>
                    <Button><AlertTriangle className="mr-2 h-4 w-4" /> Low Stock Alerts</Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Batch Visibility</CardTitle>
                    <div className="relative w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search products/batches..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">S.Price</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Mock Data */}
                            <TableRow>
                                <TableCell className="font-medium text-primary">Amoxicillin 500mg</TableCell>
                                <TableCell className="font-mono">B-2401</TableCell>
                                <TableCell className="text-muted-foreground">Oct 2026</TableCell>
                                <TableCell className="text-right font-bold">120 Units</TableCell>
                                <TableCell className="text-right font-mono">₹450.00</TableCell>
                                <TableCell className="text-right font-mono">₹54,000</TableCell>
                                <TableCell className="text-center">
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Healthy</Badge>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-primary">Paracetamol 650mg</TableCell>
                                <TableCell className="font-mono">B-2395</TableCell>
                                <TableCell className="text-red-500 font-medium">Feb 2026</TableCell>
                                <TableCell className="text-right font-bold">8 Units</TableCell>
                                <TableCell className="text-right font-mono">₹12.50</TableCell>
                                <TableCell className="text-right font-mono">₹100</TableCell>
                                <TableCell className="text-center space-y-1">
                                    <Badge variant="destructive">Low Stock</Badge>
                                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Expliring Soon</Badge>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
