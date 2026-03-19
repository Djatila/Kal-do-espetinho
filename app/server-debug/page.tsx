export default function ServerDebugPage() {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Server Debug Page</h1>
            <p>If you see this, the server is rendering correctly.</p>
            <p>Time: {new Date().toISOString()}</p>
        </div>
    )
}
