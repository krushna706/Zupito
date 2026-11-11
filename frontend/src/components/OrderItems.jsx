import { useState } from "react";
import { getProductImage, getProductName } from "../utils/orderStatus";

export default function OrderItemImage({ item, className = "customer-detail-product-image" }) {
    const image = getProductImage(item);
    const [failedImage, setFailedImage] = useState(null);
    const failed = failedImage === image;

    return (
        <div className={className}>
            {image && !failed ? (
                <img
                    src={image}
                    alt={getProductName(item)}
                    loading="lazy"
                    onError={() => setFailedImage(image)}
                />
            ) : (
                <i className="fa-solid fa-box-open" aria-hidden="true" />
            )}
        </div>
    );
}
