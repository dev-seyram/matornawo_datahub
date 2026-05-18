import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: '#111111' }} 
      className="min-h-screen flex flex-col items-center justify-center px-4">
      
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center">
          <span className="text-black font-bold text-lg">M</span>
        </div>
        <span className="text-white font-bold text-xl">MATOE CONNECT</span>
      </div>

      {/* 404 Text */}
      <h1 className="text-amber-400 font-bold mb-2"
        style={{ fontSize: '120px', lineHeight: '1' }}>
        404
      </h1>

      <h2 className="text-white text-2xl font-bold mb-3">
        Page Not Found
      </h2>

      <p className="text-gray-400 text-center max-w-sm mb-8">
        The page you are looking for does not exist or has been moved.
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl font-semibold text-black"
          style={{ backgroundColor: '#FFC107' }}
        >
          Go to Homepage
        </button>

        <button
          onClick={() => window.open('https://wa.me/233534764068?text=Hello%20MATOE%20CONNECT%2C%20I%20need%20help.', '_blank')}
          className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: '#25D366' }}
        >
          Contact Support on WhatsApp
        </button>
      </div>

      {/* Footer */}
      <p className="text-gray-600 text-sm mt-12">
        © {new Date().getFullYear()} MATOE CONNECT. All rights reserved.
      </p>
    </div>
  );
}
