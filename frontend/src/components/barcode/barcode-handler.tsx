const handleBarcodeScan = async (barcode: string) => {
    try {
        const response = await fetch(`${API_BASE}/inventory/products/barcode/${barcode}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            const product = await response.json();

            // If product has batches, add the first available batch
            if (product.batches && product.batches.length > 0) {
                const batch = product.selectedBatch || product.batches[0];
                addItem(product, batch);
            } else {
                alert(`Product "${product.name}" found but has no stock available.`);
            }
        } else {
            alert(`No product found with barcode: ${barcode}`);
        }
    } catch (error) {
        console.error("Barcode scan error:", error);
        alert("Failed to lookup barcode. Please try manual entry.");
    }
};
