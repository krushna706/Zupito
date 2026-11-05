import { useState } from "react";
import { getProductImage, getProductName } from "../utils/orderStatus";

export default function OrderItemImage({ item }) {
    const image = getProductImage(item);
    const [failedImage, setFailedImage] = useState(null);
    const failed = failedImage === image;

    return (
        <div className="customer-detail-product-image">
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
