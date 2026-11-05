import {
    getParcelStatus,
    getStatusCategory,
    statusProgress,
    trackingSteps,
    getStepTimestamp,
    formatDateTime
} from "../utils/orderStatus";

export default function OrderTimeline({ parcel, order, isDemo }) {
    const status = getParcelStatus(parcel);
    const isCancelled = getStatusCategory(status) === "cancelled";
    const currentStep = statusProgress[status] ?? -1;

    const visibleSteps = isCancelled
        ? [
              trackingSteps[0],
              {
                  key: "cancelled",
                  label: "Order Cancelled",
                  description: "This package has been cancelled.",
                  dateKey: "cancelledAt"
              }
          ]
        : trackingSteps;

    return (
        <div className="customer-detail-tracking">
            {visibleSteps.map((step, index) => {
                const isCompleted = isCancelled ? true : index <= currentStep;

                const isCurrent = isCancelled
                    ? index === visibleSteps.length - 1
                    : index === currentStep && status !== "delivered";

                const timestamp = getStepTimestamp(parcel, order, step, isDemo);

                const formattedTimestamp = isCompleted ? formatDateTime(timestamp, isDemo) : null;

                return (
                    <div
                        key={step.key}
                        className={`customer-detail-step ${isCompleted ? "is-completed" : ""} ${
                            isCurrent ? "is-current" : ""
                        } ${step.key === "cancelled" ? "is-cancelled" : ""}`}
                    >
                        <div className="customer-detail-step-marker">
                            <span>
                                {isCompleted ? (
                                    <i
                                        className={`fa-solid ${
                                            step.key === "cancelled" ? "fa-xmark" : "fa-check"
                                        }`}
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <i className="fa-solid fa-circle" aria-hidden="true" />
                                )}
                            </span>
                        </div>

                        <div className="customer-detail-step-content">
                            <div>
                                <h4>{step.label}</h4>

                                {formattedTimestamp ? (
                                    <time>{formattedTimestamp}</time>
                                ) : (
                                    <span className="customer-detail-step-time">
                                        {isCompleted ? "Time not recorded" : "Pending"}
                                    </span>
                                )}
                            </div>

                            <p>{step.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
