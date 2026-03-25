"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    fontFamily: "system-ui, sans-serif",
                    backgroundColor: "#f8fafc",
                }}>
                    <div style={{ textAlign: "center", maxWidth: "400px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", marginBottom: "8px" }}>
                            Something went wrong
                        </h2>
                        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>
                            {error.message || "An unexpected error occurred."}
                        </p>
                        <button
                            onClick={reset}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px",
                                marginRight: "8px",
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.href = "/login"}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: "white",
                                color: "#0f172a",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px",
                            }}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
