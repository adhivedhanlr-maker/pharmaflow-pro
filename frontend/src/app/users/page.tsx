"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
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
import { Plus, Trash2, Edit2, ShieldAlert, User as UserIcon } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { token, user: currentUser } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "BILLING_OPERATOR",
    });

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE}/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setIsDialogOpen(false);
                setFormData({ username: "", password: "", name: "", role: "BILLING_OPERATOR" });
                fetchUsers();
            }
        } catch (error) {
            console.error("Failed to create user:", error);
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
                fetchUsers();
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
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    if (currentUser?.role !== "ADMIN") {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <ShieldAlert className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-slate-500">Only administrators can manage system users.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-slate-500 text-sm">Create and manage staff access levels</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Username</label>
                                <Input
                                    placeholder="Choose a username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Access Role</label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger>
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
                            <Button type="submit" className="w-full">Create Account</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50">
                    <CardTitle className="text-lg">System Users</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">Loading users...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">No users found</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <UserIcon className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <span className="font-medium text-slate-900">{user.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{user.username}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell className="text-slate-500 text-xs">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 transition-colors"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={user.id === currentUser?.id}
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
    );
}
