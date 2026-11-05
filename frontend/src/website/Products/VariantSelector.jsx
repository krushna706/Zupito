import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAvailableStock, getVariantId } from "../../utils/productVariants";

function VariantSelector({ product, selectedVariant }) {
    const [, setSearchParams] = useSearchParams();
    const [notice, setNotice] = useState(null);

    const groups = product.optionGroups ?? [];
    const variants = product.variants ?? [];
    const selection = selectedVariant?.options ?? {};

    if (!variants.length || !selectedVariant) return null;

    const getLabel = (group, value) => group.values.find((item) => item.value === value)?.label ?? value;

    const findVariant = (key, value) => {
        const candidates = variants.filter((variant) => variant.options?.[key] === value);

        if (!candidates.length) return null;

        const exact = candidates.find((variant) =>
            Object.entries(selection).every(
                ([name, selected]) => name === key || variant.options?.[name] === selected
            )
        );

        if (exact) return exact;

        const available = candidates.filter((variant) => getAvailableStock(variant) > 0);

        const pool = available.length ? available : candidates;

        const score = (variant) =>
            Object.entries(selection).filter(
                ([name, selected]) => name !== key && variant.options?.[name] === selected
            ).length;

        return pool.reduce((best, variant) => (score(variant) > score(best) ? variant : best));
    };

    const selectOption = (group, value) => {
        if (selection[group.key] === value) return;

        const variant = findVariant(group.key, value);
        if (!variant) return;

        const variantId = getVariantId(variant);

        const changes = groups
            .filter((item) => item.key !== group.key && selection[item.key] !== variant.options?.[item.key])
            .map((item) => `${item.label}: ${getLabel(item, variant.options?.[item.key])}`);

        setNotice(
            changes.length
                ? {
                      variantId,
                      text: `Updated to ${changes.join(", ")} to match this option.`
                  }
                : null
        );

        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("variant", variantId);
            return next;
        });
    };

    return (
        <div className="product-variant-groups">
            {groups.map((group) => (
                <fieldset key={group.key} className="product-variant-group">
                    <legend>
                        {group.label}
                        {selection[group.key] != null && (
                            <span>: {getLabel(group, selection[group.key])}</span>
                        )}
                    </legend>

                    <div className="product-variant-values">
                        {group.values.map((option) => {
                            const selected = selection[group.key] === option.value;
                            const target = findVariant(group.key, option.value);
                            const label = option.label ?? option.value;
                            const soldOut = target && getAvailableStock(target) === 0;

                            const title = !target
                                ? `${label} — unavailable`
                                : soldOut
                                  ? `${label} — out of stock`
                                  : String(label);

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`product-variant-button ${selected ? "is-selected" : ""}`}
                                    aria-pressed={selected}
                                    aria-label={`${group.label}: ${title}`}
                                    disabled={!target}
                                    title={title}
                                    onClick={() => selectOption(group, option.value)}
                                >
                                    {option.swatch && (
                                        <svg
                                            className="product-colour-swatch"
                                            viewBox="0 0 18 18"
                                            aria-hidden="true"
                                            focusable="false"
                                        >
                                            <circle cx="9" cy="9" r="9" fill={option.swatch} />
                                        </svg>
                                    )}
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            ))}

            {notice?.variantId === getVariantId(selectedVariant) && (
                <p className="product-selection-note" role="status">
                    {notice.text}
                </p>
            )}
        </div>
    );
}

export default VariantSelector;
