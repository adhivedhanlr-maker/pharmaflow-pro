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
import { Loader2, Calendar, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { io } from "socket.io-client";

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
        hourlyRate?: number;
        overtimeRate?: number;
    };
}

export default function AttendancePage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM


    useEffect(() => {
        if (token) fetchAttendance();

        const socket = io(API_BASE);
        socket.on('attendance-update', (data) => {
            console.log("Real-time update received:", data);
            fetchAttendance();
        });

        return () => {
            socket.disconnect();
        };
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
                overtimeMinutes: 0,
                sessions: 0,
                hourlyRate: curr.user.hourlyRate || 500,
                overtimeRate: curr.user.overtimeRate || 750
            };
        }

        let regularMins = curr.duration;
        let otMins = 0;

        if (curr.duration > 540) { // > 9 hours
            regularMins = 540;
            otMins = curr.duration - 540;
        }

        acc[curr.userId].totalMinutes += regularMins;
        acc[curr.userId].overtimeMinutes += otMins;
        acc[curr.userId].sessions += 1;
        return acc;
    }, {} as Record<string, { name: string, totalMinutes: number, overtimeMinutes: number, sessions: number, hourlyRate: number, overtimeRate: number }>);

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
    };

    return (
        <RoleGate allowedRoles={["ADMIN"]}>
            <div className="space-y-4 md:space-y-6">
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
                        const regularHours = stats.totalMinutes / 60;
                        const otHours = stats.overtimeMinutes / 60;
                        const pay = (regularHours * stats.hourlyRate) + (otHours * stats.overtimeRate);

                        return (
                            <Card key={userId} className="border-slate-200">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base font-medium">{stats.name}</CardTitle>
                                            <CardDescription>{stats.sessions} sessions in {format(new Date(filterMonth), 'MMMM yyyy')}</CardDescription>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground">
                                            <div>Rate: ₹{stats.hourlyRate}/hr</div>
                                            <div>OT: ₹{stats.overtimeRate}/hr</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl font-bold">{formatDuration(stats.totalMinutes + stats.overtimeMinutes)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Reg: {formatDuration(stats.totalMinutes)} • OT: {formatDuration(stats.overtimeMinutes)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 justify-end text-green-600 font-bold text-lg">
                                                ₹{pay.toFixed(2)}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Est. Pay</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[600px]">
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
