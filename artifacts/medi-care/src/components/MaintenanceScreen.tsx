export default function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #1E40AF 100%)" }}>
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-sm w-full border border-white/20">
        <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-4xl">🔧</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Under Maintenance</h1>
        <p className="text-blue-100 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center justify-center gap-2 text-blue-200 text-xs">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span>We'll be back shortly</span>
        </div>
        <button onClick={() => window.location.reload()}
          className="mt-6 w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-xl text-sm hover:bg-yellow-300 transition-colors">
          Try Again
        </button>
      </div>
      <p className="text-blue-200 text-xs mt-6">Fatima Medical Store</p>
    </div>
  );
}