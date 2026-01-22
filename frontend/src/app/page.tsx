import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Package,
  Users,
  AlertCircle
} from "lucide-react";

const stats = [
  {
    title: "Total Sales (Today)",
    value: "₹45,231.89",
    description: "+20.1% from yesterday",
    icon: TrendingUp,
    color: "text-green-600",
  },
  {
    title: "Active Stock Items",
    value: "1,280",
    description: "Across 42 categories",
    icon: Package,
    color: "text-blue-600",
  },
  {
    title: "Total Customers",
    value: "842",
    description: "12 added this month",
    icon: Users,
    color: "text-purple-600",
  },
  {
    title: "Expiring Soon",
    value: "24",
    description: "Items expiring within 30 days",
    icon: AlertCircle,
    color: "text-red-600",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Real-time summary of your pharmaceutical distribution operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Table of recent invoices will appear here.
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Low stock and expiry alerts will appear here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

