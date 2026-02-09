"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, User as UserIcon, Calendar, Save } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    canGenerateInvoice: boolean;
    hourlyRate: number;
    overtimeRate: number;
    paymentMethod: "HOURLY" | "SALARY";
    monthlySalary: number;
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

export default function AttendanceProfilePage() {
    const { userId } = useParams();
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        paymentMethod: "HOURLY",
        hourlyRate: 500,
        overtimeRate: 750,
        monthlySalary: 0,
    });

    useEffect(() => {
        if (token && userId) {
            fetchData();
        }
    }, [token, userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [userRes, attendanceRes] = await Promise.all([
                fetch(`${API_BASE}/users/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/users/${userId}/attendance`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData);
                setFormData({
                    paymentMethod: userData.paymentMethod || "HOURLY",
                    hourlyRate: userData.hourlyRate || 500,
                    overtimeRate: userData.overtimeRate || 750,
                    monthlySalary: userData.monthlySalary || 0,
                });
            }
            if (attendanceRes.ok) {
                setAttendance(await attendanceRes.json());
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            toast.error("Failed to load user data");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_BASE}/users/${userId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("Payroll settings updated successfully");
                fetchData(); // Refresh data
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            console.error("Failed to update settings:", error);
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
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
                    <Link href="/attendance">Back to Attendance</Link>
                </Button>
            </div>
        );
    }

    return (
        <RoleGate allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/attendance">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Attendance & Payroll Profile</h1>
                        <p className="text-slate-500 text-sm">Manage payroll settings and view attendance logs for {user.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Info & Settings Card */}
                    <Card className="md:col-span-1 border-slate-200 h-fit">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <div className="flex justify-center mb-4">
                                <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center">
                                    <UserIcon className="h-12 w-12 text-slate-500" />
                                </div>
                            </div>
                            <CardTitle className="text-center text-xl">{user.name}</CardTitle>
                            <CardDescription className="text-center">{user.role}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-slate-900">Payroll Settings</h3>

                                <div className="space-y-3">
                                    <Label>Payment Method</Label>
                                    <RadioGroup
                                        value={formData.paymentMethod}
                                        onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="HOURLY" id="hourly" />
                                            <Label htmlFor="hourly">Hourly</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="SALARY" id="salary" />
                                            <Label htmlFor="salary">Fixed Salary</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {formData.paymentMethod === "HOURLY" ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Hourly Rate (₹)</Label>
                                            <Input
                                                type="number"
                                                value={formData.hourlyRate}
                                                onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Overtime Rate (₹/hr)</Label>
                                            <Input
                                                type="number"
                                                value={formData.overtimeRate}
                                                onChange={(e) => setFormData({ ...formData, overtimeRate: Number(e.target.value) })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Monthly Salary (₹)</Label>
                                        <Input
                                            type="number"
                                            value={formData.monthlySalary}
                                            onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                                        />
                                    </div>
                                )}

                                <Button
                                    className="w-full gap-2"
                                    onClick={handleSaveSettings}
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Changes
                                </Button>
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
