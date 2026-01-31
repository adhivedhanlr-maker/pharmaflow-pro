"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Camera, X, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
    isOpen: boolean;
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
    const [manualEntry, setManualEntry] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState("");
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        if (isOpen && !showManual) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isOpen, showManual]);

    const startScanner = async () => {
        try {
            setError("");
            const scanner = new Html5Qrcode("barcode-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    onScan(decodedText);
                    stopScanner();
                    onClose();
                },
                (errorMessage) => {
                    // Ignore continuous scan errors
                }
            );

            setIsScanning(true);
        } catch (err: any) {
            setError("Camera access denied or not available. Use manual entry.");
            setShowManual(true);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    const handleManualSubmit = () => {
        if (manualEntry.trim()) {
            onScan(manualEntry.trim());
            setManualEntry("");
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan Barcode</DialogTitle>
                </DialogHeader>

                {!showManual ? (
                    <div className="space-y-4">
                        <div id="barcode-reader" className="w-full rounded-lg overflow-hidden border" />

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowManual(true)}
                            >
                                <Keyboard className="h-4 w-4 mr-2" />
                                Manual Entry
                            </Button>
                            <Button variant="outline" onClick={onClose}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Enter Barcode Manually</label>
                            <Input
                                placeholder="Type or paste barcode"
                                value={manualEntry}
                                onChange={(e) => setManualEntry(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowManual(false);
                                    setError("");
                                }}
                            >
                                <Camera className="h-4 w-4 mr-2" />
                                Use Camera
                            </Button>
                            <Button onClick={handleManualSubmit} className="flex-1">
                                Submit
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
