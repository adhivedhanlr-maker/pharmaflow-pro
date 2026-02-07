"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Calendar, Clock, Download, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AttendanceRecord {
    id: string;
    userId: string;
    startTime: string;
    endTime: string | null;
    duration: number | null; // in minutes
    user: {
        name: string;
        role: string;
    };
}

export default function AttendancePage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [hourlyRate, setHourlyRate] = useState<string>("500");

    useEffect(() => {
        if (token) fetchAttendance();
    }, [token]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/users/attendance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRecords(data);
            }
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter by month
    const filteredRecords = records.filter(r => r.startTime.startsWith(filterMonth));

    // Calculate totals per user
    const userTotals = filteredRecords.reduce((acc, curr) => {
        if (!curr.duration) return acc;
        if (!acc[curr.userId]) {
            acc[curr.userId] = {
                name: curr.user.name,
                totalMinutes: 0,
                sessions: 0
            };
        }
        acc[curr.userId].totalMinutes += curr.duration;
        acc[curr.userId].sessions += 1;
        return acc;
    }, {} as Record<string, { name: string, totalMinutes: number, sessions: number }>);

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
    };

    return (
        <RoleGate allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Attendance & Payroll</h1>
                        <p className="text-muted-foreground">Detailed logs of rep duty times and calculated work hours.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="month"
                            className="w-[180px]"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                        />
                        <Button variant="outline" onClick={fetchAttendance} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                        </Button>
                    </div>
                </div>

                {/* Payroll Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(userTotals).map(([userId, stats]) => {
                        const hours = stats.totalMinutes / 60;
                        const pay = hours * parseFloat(hourlyRate || "0");

                        return (
                            <Card key={userId} className="border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-medium">{stats.name}</CardTitle>
                                    <CardDescription>{stats.sessions} sessions in {format(new Date(filterMonth), 'MMMM yyyy')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl font-bold">{formatDuration(stats.totalMinutes)}</p>
                                            <p className="text-xs text-muted-foreground">Total Hours</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 justify-end text-green-600 font-bold text-lg">
                                                <DollarSign className="h-4 w-4" />
                                                {pay.toFixed(2)}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Est. Pay (@ {hourlyRate}/hr)</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 max-w-sm ml-auto">
                    <span className="text-sm font-medium whitespace-nowrap">Hourly Rate (₹):</span>
                    <Input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="w-24 h-8"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Clock In</TableHead>
                                    <TableHead>Clock Out</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No attendance records found for this month.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{record.user.name}</TableCell>
                                            <TableCell>{format(new Date(record.startTime), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="text-green-600">
                                                {format(new Date(record.startTime), 'hh:mm a')}
                                            </TableCell>
                                            <TableCell className="text-red-500">
                                                {record.endTime ? format(new Date(record.endTime), 'hh:mm a') : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {record.duration ? formatDuration(record.duration) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {record.endTime ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
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
        </RoleGate>
    );
}
