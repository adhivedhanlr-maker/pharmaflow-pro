import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle2, XCircle } from "lucide-react";
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

    // Helper to convert file to base64
    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async () => {
        if (!otp || otp.length < 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let proofUrl = undefined;
            let signatureUrl = undefined;

            if (proofFile) {
                // In a real app, upload to storage bucket here. 
                // For demo, we send base64 or just a placeholder filename if backend expects URL.
                // The current backend service accepts a string. We'll send base64 data URI directly for now 
                // as it's the simplest way without setting up S3/Cloudinary.
                // NOTE: Payload size might be large.
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
                    signatureUrl
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
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Photo Proof (Optional)</Label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 border-slate-300">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                    <p className="text-xs text-slate-500">{proofFile ? "File Selected" : "Upload Photo"}</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                            </label>
                            {proofFile && <p className="text-[10px] text-green-600 truncate">{proofFile.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Signature (Optional)</Label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 border-slate-300">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                    <p className="text-xs text-slate-500">{signatureFile ? "File Selected" : "Upload Image"}</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setSignatureFile(e.target.files?.[0] || null)} />
                            </label>
                            {signatureFile && <p className="text-[10px] text-green-600 truncate">{signatureFile.name}</p>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || otp.length !== 6}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Verify Delivery
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
