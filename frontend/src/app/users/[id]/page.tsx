"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, User as UserIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    canGenerateInvoice: boolean;
    hourlyRate: number;
    overtimeRate: number;
    createdAt: string;
}

interface AttendanceRecord {
    id: string;
    userId: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
    user: {
        name: string;
        role: string;
    };
}

export default function UserProfilePage() {
    const { id } = useParams();
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        if (token && id) {
            fetchData();
        }
    }, [token, id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [userRes, attendanceRes] = await Promise.all([
                fetch(`${API_BASE}/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/users/${id}/attendance`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (userRes.ok) {
                setUser(await userRes.json());
            }
            if (attendanceRes.ok) {
                setAttendance(await attendanceRes.json());
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold">User Not Found</h1>
                <Button variant="outline" asChild>
                    <Link href="/users">Back to Users</Link>
                </Button>
            </div>
        );
    }

    return (
        <RoleGate allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/users">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">User Profile</h1>
                        <p className="text-slate-500 text-sm">View details and attendance history</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Info Card */}
                    <Card className="md:col-span-1 border-slate-200 h-fit">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <div className="flex justify-center mb-4">
                                <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center">
                                    <UserIcon className="h-12 w-12 text-slate-500" />
                                </div>
                            </div>
                            <CardTitle className="text-center text-xl">{user.name}</CardTitle>
                            <CardDescription className="text-center">{user.username}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between py-2 border-b text-sm">
                                <span className="text-slate-500">Role</span>
                                {getRoleBadge(user.role)}
                            </div>
                            <div className="flex justify-between py-2 border-b text-sm">
                                <span className="text-slate-500">Hourly Rate</span>
                                <span className="font-medium">₹{user.hourlyRate}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b text-sm">
                                <span className="text-slate-500">Overtime Rate</span>
                                <span className="font-medium">₹{user.overtimeRate}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b text-sm">
                                <span className="text-slate-500">Joined</span>
                                <span className="font-medium">{format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Attendance History */}
                    <Card className="md:col-span-2 border-slate-200">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Attendance History</CardTitle>
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {attendance.length} Records
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Clock In</TableHead>
                                        <TableHead>Clock Out</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendance.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                                No attendance records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        attendance.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell>{format(new Date(record.startTime), 'MMM dd, yyyy')}</TableCell>
                                                <TableCell className="text-green-600 font-medium">
                                                    {format(new Date(record.startTime), 'hh:mm a')}
                                                </TableCell>
                                                <TableCell className="text-red-500">
                                                    {record.endTime ? format(new Date(record.endTime), 'hh:mm a') : '-'}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {record.duration ? formatDuration(record.duration) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.endTime ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800">
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800 animate-pulse">
                                                            Active
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </RoleGate>
    );
}
