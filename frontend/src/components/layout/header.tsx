import { Bell, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
    return (
        <header className="h-16 border-b bg-background flex items-center justify-between px-8">
            <div>
                <h2 className="text-lg font-semibold">Dashboard Overview</h2>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative cursor-pointer hover:bg-muted p-2 rounded-full">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <Badge className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-red-600 text-white">
                        2
                    </Badge>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                </div>
            </div>
        </header>
    );
}
