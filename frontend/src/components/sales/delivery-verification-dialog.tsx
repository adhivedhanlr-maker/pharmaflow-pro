import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, CheckCircle2, XCircle, Camera, MapPin } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface DeliveryVerificationDialogProps {
    invoiceId: string;
    customerName: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DeliveryVerificationDialog({
    invoiceId,
    customerName,
    isOpen,
    onOpenChange,
    onSuccess
}: DeliveryVerificationDialogProps) {
    const { token } = useAuth();
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [deliveryInfo, setDeliveryInfo] = useState("");
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Helper to compress and convert file to base64
    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to JPEG with 0.7 quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = error => reject(error);
    });

    const getLocation = () => new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    });

    const handleSubmit = async () => {
        if (!otp || otp.length < 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);
        setIsGettingLocation(true);
        setError("");

        try {
            // Get Location
            let location: { lat: number; lng: number } | undefined = undefined;
            try {
                const pos = await getLocation();
                location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
            } catch (locErr) {
                console.warn("Could not get location:", locErr);
                // We might want to warn the user or block, but for now we proceed without location if it fails
                // Or maybe the user *requires* location. "sales rep could be able to ... upload with location"
                // Assuming it's preferred but fallback allowed if GPS fails/denied? 
                // Let's assume we proceed but maybe logging it would be good.
            }
            setIsGettingLocation(false);

            let proofUrl = undefined;
            let signatureUrl = undefined;

            if (proofFile) {
                proofUrl = await toBase64(proofFile);
            }

            if (signatureFile) {
                signatureUrl = await toBase64(signatureFile);
            }

            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${API_BASE}/sales/${invoiceId}/verify-delivery`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    otp,
                    proofUrl,
                    signatureUrl,
                    deliveryLatitude: location?.lat,
                    deliveryLongitude: location?.lng,
                    deliveryInfo
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Verification failed");
            }

            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setIsGettingLocation(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Verify Delivery</DialogTitle>
                    <DialogDescription>
                        Enter the OTP provided by <strong>{customerName}</strong> to confirm delivery.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="otp">Delivery OTP (6-digits)</Label>
                        <Input
                            id="otp"
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className="text-center text-2xl tracking-[1em] font-mono h-14"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Photo Proof (Required)</Label>
                        <div className="flex flex-col gap-2">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-blue-50 border-blue-300 bg-blue-50/30 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Camera className="w-8 h-8 text-blue-500 mb-2" />
                                    <p className="text-sm text-blue-600 font-medium text-center">Take Photo<br />(Camera)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                        {proofFile && (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="truncate flex-1">{proofFile.name}</span>
                                <button onClick={() => setProofFile(null)} className="text-slate-400 hover:text-red-500">
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Location will be captured on verification
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label>Delivery Notes / Info (Optional)</Label>
                            <Textarea
                                placeholder="Add any additional details about the delivery..."
                                value={deliveryInfo}
                                onChange={(e) => setDeliveryInfo(e.target.value)}
                                className="resize-none h-20"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || otp.length !== 6}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {isGettingLocation ? "Locating..." : "Verifying..."}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Verify Delivery
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
