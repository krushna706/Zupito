export default function LoadingState({ title, description }) {
    return (
        <section>
            <div className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">{title}</h1>

                    <p className="panel-page-description">
                        {description || "Manage your Zupito operations from this panel."}
                    </p>
                </div>
            </div>

            <div className="panel-card">
                <div className="panel-card-header">
                    <div>
                        <h2 className="panel-card-title">{title}</h2>

                        <p className="panel-card-description">Frontend layout preview</p>
                    </div>
                </div>

                <div className="panel-card-body">
                    <p>This is a temporary page for testing the Zupito staff panel layout.</p>

                    <p>
                        Header, sidebar, navigation and responsive design can be tested here. The actual page
                        functionality will be implemented next.
                    </p>
                </div>
            </div>
        </section>
    );
}
