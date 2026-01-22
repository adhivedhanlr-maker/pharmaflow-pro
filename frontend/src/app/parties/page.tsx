"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
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
    Plus,
    Filter,
    MoreVertical,
    UserPlus,
    Building2,
    Phone,
    FileText
} from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function PartiesPage() {
    const [activeTab, setActiveTab] = useState("customers");
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Parties Management</h1>
                    <p className="text-muted-foreground">Manage your customers and suppliers database.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {activeTab === "customers" ? "New Customer" : "New Supplier"}
                </Button>
            </div>

            <Tabs defaultValue="customers" onValueChange={setActiveTab} className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="customers" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
                            Customers
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
                            Suppliers
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search parties..."
                                className="pl-8 w-[250px] lg:w-[350px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <TabsContent value="customers" className="border-none p-0 outline-none">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer Name</TableHead>
                                        <TableHead>GSTIN</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead className="text-right">Credit Limit</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Mock Data for Display */}
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium text-primary">Vikas Pharmacy</div>
                                            <div className="text-xs text-muted-foreground">Pallet No. 23, Sector 5</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs uppercase">27AAACN1234F1Z1</TableCell>
                                        <TableCell>+91 98765 43210</TableCell>
                                        <TableCell className="text-right font-mono">₹50,000</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="destructive" className="font-mono">₹12,450</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium text-primary">Apollo Meds Ltd</div>
                                            <div className="text-xs text-muted-foreground">Industrial Area, Pune</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs uppercase">27BBBDM5678G2Z2</TableCell>
                                        <TableCell>+91 91234 56789</TableCell>
                                        <TableCell className="text-right font-mono">₹2,00,000</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="font-mono">₹0.00</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suppliers" className="border-none p-0 outline-none">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier Name</TableHead>
                                        <TableHead>GSTIN</TableHead>
                                        <TableHead>Contact Person</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium text-primary">Cipla Pharmaceuticals</div>
                                            <div className="text-xs text-muted-foreground">Mumbai HQ, Maharashtra</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs uppercase">27CIPLA1234X1Z0</TableCell>
                                        <TableCell>Rajesh Kumar</TableCell>
                                        <TableCell>+91 22 4567 8900</TableCell>
                                        <TableCell className="text-right font-mono text-red-600">₹4,50,000</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
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
