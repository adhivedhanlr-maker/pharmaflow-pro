"use client";

import { useState, useEffect } from "react";
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
    Building2,
    Phone,
    Loader2,
    Trash2,
    Edit
} from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Party {
    id: string;
    name: string;
    gstin: string;
    phone: string;
    address: string;
    creditLimit?: number;
    currentBalance: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

import { cn } from "@/lib/utils";

import { CustomerDialog } from "@/components/billing/customer-dialog";

export default function PartiesPage() {
    const [activeTab, setActiveTab] = useState("customers");
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchParties();
    }, [activeTab]);

    const fetchParties = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === "customers" ? "customers" : "suppliers";
            const response = await fetch(`${API_BASE}/parties/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (response.ok) {
                setParties(await response.json());
            }
        } catch (error) {
            console.error("Failed to fetch parties:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;

        try {
            const endpoint = activeTab === "customers" ? "customers" : "suppliers";
            const response = await fetch(`${API_BASE}/parties/${endpoint}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                fetchParties(); // Refresh list
            } else {
                alert('Failed to delete. This party may have associated transactions.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete party');
        }
    };

    const filteredParties = parties.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.gstin.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Parties Management</h1>
                    <p className="text-muted-foreground">Manage your customers and suppliers database.</p>
                </div>
                <CustomerDialog
                    type={activeTab === "customers" ? "customer" : "supplier"}
                    onSuccess={fetchParties}
                />
            </div>

            <Tabs defaultValue="customers" onValueChange={setActiveTab} className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="customers">Customers</TabsTrigger>
                        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
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
                        <Button variant="outline" size="icon" onClick={fetchParties}>
                            <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                <TabsContent value="customers" className="m-0">
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
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
                                        </TableRow>
                                    ) : filteredParties.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No customers found.</TableCell>
                                        </TableRow>
                                    ) : filteredParties.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="font-medium text-primary">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.address}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs uppercase">{p.gstin}</TableCell>
                                            <TableCell>{p.phone || "N/A"}</TableCell>
                                            <TableCell className="text-right font-mono">₹{p.creditLimit?.toLocaleString() || "0"}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={p.currentBalance > 0 ? "destructive" : "outline"} className="font-mono">
                                                    ₹{p.currentBalance.toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => alert('Edit functionality coming soon')}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(p.id, p.name)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suppliers" className="m-0">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier Name</TableHead>
                                        <TableHead>GSTIN</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
                                        </TableRow>
                                    ) : filteredParties.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No suppliers found.</TableCell>
                                        </TableRow>
                                    ) : filteredParties.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="font-medium text-primary">{p.name}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs uppercase">{p.gstin}</TableCell>
                                            <TableCell>{p.phone || "N/A"}</TableCell>
                                            <TableCell className="text-xs">{p.address}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={p.currentBalance > 0 ? "text-red-600 font-bold" : ""}>
                                                    ₹{p.currentBalance.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => alert('Edit functionality coming soon')}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(p.id, p.name)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


