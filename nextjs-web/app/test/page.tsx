export default function TestPage() {
  return (
    <div>
      <h1>Test Page</h1>
      <p>This is a test page to verify Next.js is working.</p>

      <div style={{display: 'flex', gap: '20px', margin: '20px 0'}}>
        <div
          style={{
            backgroundColor: 'lightblue',
            padding: '16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => alert('Card 1 clicked!')}
        >
          <h3>Card 1</h3>
          <p>Count: 10</p>
        </div>

        <div
          style={{
            backgroundColor: 'lightgreen',
            padding: '16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => alert('Card 2 clicked!')}
        >
          <h3>Card 2</h3>
          <p>Count: 5</p>
        </div>
      </div>
    </div>
  );
}
