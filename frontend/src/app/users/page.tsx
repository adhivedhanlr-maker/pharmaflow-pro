"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, ShieldAlert, User as UserIcon, Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RoleGate } from "@/components/auth/role-gate";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    canGenerateInvoice: boolean;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const { token, user: currentUser } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "BILLING_OPERATOR",
        canGenerateInvoice: false,
    });

    useEffect(() => {
        if (token && currentUser?.role === "ADMIN") {
            fetchUsers();
        }
    }, [token, currentUser]);

    const fetchUsers = async () => {
        try {
            console.log("Fetching users from:", `${API_BASE}/users`);
            const response = await fetch(`${API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched users:", data);
                setUsers(data);
            } else {
                console.error("Failed to fetch users, status:", response.status);
                const err = await response.text();
                console.error("Error body:", err);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        console.log("Attempting to create user with data:", formData);
        
        try {
            const response = await fetch(`${API_BASE}/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            
            console.log("Response status:", response.status);
            const result = await response.json();
            console.log("Response JSON:", result);

            if (response.ok) {
                toast.success("User created successfully");
                setIsDialogOpen(false);
                setFormData({ username: "", password: "", name: "", role: "BILLING_OPERATOR", canGenerateInvoice: false });
                fetchUsers();
            } else {
                const message = result.message || "Failed to create user";
                toast.error(message);
                console.error("Create user failed:", message);
                
                if (response.status === 409) {
                    toast.error("Tip: This username is already taken. Please try another one.");
                }
            }
        } catch (error) {
            toast.error("Network error. Please check if backend is running.");
            console.error("Failed to create user (exception):", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            const response = await fetch(`${API_BASE}/users/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                toast.success("User deleted successfully");
                fetchUsers();
            } else {
                toast.error("Failed to delete user");
            }
        } catch (error) {
            console.error("Failed to delete user:", error);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "ADMIN": return <Badge variant="default" className="bg-purple-600">Admin</Badge>;
            case "BILLING_OPERATOR": return <Badge variant="secondary">Billing</Badge>;
            case "WAREHOUSE_MANAGER": return <Badge variant="outline">Warehouse</Badge>;
            case "ACCOUNTANT": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">Accountant</Badge>;
            case "SALES_REP": return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Sales Rep</Badge>;
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <RoleGate
            allowedRoles={["ADMIN"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">
                        You don't have permission to view this page. Please contact your system administrator if you believe this is an error.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-medium">User Management</h1>
                        <p className="text-slate-500 text-sm">Create and manage staff access levels</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-0">
                                <Plus className="h-4 w-4" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser} className="space-y-5 pt-4">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Full Name</Label>
                                    <Input
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Username</Label>
                                    <Input
                                        placeholder="Choose a unique username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Password</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Access Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(val) => setFormData({ ...formData, role: val })}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ADMIN">System Administrator</SelectItem>
                                            <SelectItem value="BILLING_OPERATOR">Billing Operator</SelectItem>
                                            <SelectItem value="WAREHOUSE_MANAGER">Warehouse Manager</SelectItem>
                                            <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                                            <SelectItem value="SALES_REP">Sales Representative</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.role === "SALES_REP" && (
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-medium">Invoice Permission</Label>
                                            <p className="text-xs text-slate-500">Allow this user to generate invoices</p>
                                        </div>
                                        <Switch
                                            checked={formData.canGenerateInvoice}
                                            onCheckedChange={(checked) => setFormData({ ...formData, canGenerateInvoice: checked })}
                                        />
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={isCreating}>
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : "Create Account"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                        <CardTitle className="text-lg font-semibold text-slate-800">System Users</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/30">
                                <TableRow>
                                    <TableHead className="px-6">Name</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined Date</TableHead>
                                    <TableHead className="text-right px-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-16">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-2" />
                                            <p className="text-slate-500 animate-pulse">Loading secure user list...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-16 text-slate-500">
                                            <div className="bg-slate-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                <UserIcon className="h-6 w-6" />
                                            </div>
                                            <p className="font-medium text-slate-600">No users found</p>
                                            <p className="text-sm">Click "Add User" to create your first team member.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((u) => (
                                        <TableRow key={u.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <TableCell className="px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center ring-2 ring-white">
                                                        <UserIcon className="h-4 w-4 text-indigo-600" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900">{u.name}</span>
                                                        <span className="text-[10px] text-indigo-600 font-medium uppercase tracking-wider">{u.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 font-medium">{u.username}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1.5">
                                                    {getRoleBadge(u.role)}
                                                    {u.role === "SALES_REP" && (
                                                        <Badge variant="outline" className={`text-[10px] py-0 h-4 border-0 font-bold ${u.canGenerateInvoice ? "text-emerald-600" : "text-slate-400 italic font-medium"}`}>
                                                            {u.canGenerateInvoice ? "• INVOICING ALLOWED" : "ORDERING ONLY"}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-xs tabular-nums">
                                                {new Date(u.createdAt).toLocaleDateString(undefined, {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-white shadow-none transition-all"
                                                        asChild
                                                    >
                                                        <a href={`/users/${u.id}`}>
                                                            <Edit2 className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-white shadow-none transition-all"
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        disabled={u.id === currentUser?.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </RoleGate>
    );
}
