"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Package, User, MapPin } from "lucide-react";

interface OrderDetailsDialogProps {
    order: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Order {order.orderNumber}</span>
                        <Badge variant="outline">{order.status}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Placed on {format(new Date(order.createdAt), "PPP p")}
                    </DialogDescription>
                </DialogHeader>

                {order.status === 'READY' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 text-sm text-green-800 flex items-start">
                        <Package className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
                        <div>
                            <span className="font-semibold">Invoice Generated!</span>
                            <p className="text-xs mt-0.5">
                                This order has been converted. You can find the assigned delivery and invoice in the <b>Deliveries</b> page.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium flex items-center text-muted-foreground">
                            <User className="h-4 w-4 mr-2" /> Customer
                        </h4>
                        <p className="font-semibold">{order.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer.phone || "No Phone"}</p>
                        <div className="flex items-start mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1 mt-0.5 text-muted-foreground" />
                            <span className="text-sm">{order.customer.address || "No Address"}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium flex items-center text-muted-foreground">
                            <Package className="h-4 w-4 mr-2" /> Sales Rep
                        </h4>
                        <p className="font-semibold">{order.rep.name}</p>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.product.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.isBackorder ? "Backorder" : "In Stock"}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₹{item.price}</TableCell>
                                    <TableCell className="text-right">₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-bold">
                                <TableCell colSpan={3} className="text-right">Total Amount</TableCell>
                                <TableCell className="text-right">₹{order.totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
