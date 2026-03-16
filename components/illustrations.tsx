export function DecorativeIllustrations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating Items - Top */}
      <div className="absolute top-20 left-[10%] animate-bounce" style={{ animationDuration: '3s' }}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="25" fill="#00c8c8" opacity="0.8" />
          <circle cx="30" cy="30" r="15" fill="white" opacity="0.5" />
        </svg>
      </div>
      
      <div className="absolute top-32 right-[15%] animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
          <rect x="10" y="10" width="30" height="30" rx="5" fill="#ff7b54" opacity="0.8" transform="rotate(15 25 25)" />
        </svg>
      </div>

      <div className="absolute top-48 left-[25%] animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <polygon points="20,5 35,35 5,35" fill="#7ed957" opacity="0.7" />
        </svg>
      </div>

      {/* Stars */}
      <div className="absolute top-16 right-[30%]">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 2L18 12H28L20 18L23 28L15 22L7 28L10 18L2 12H12L15 2Z" fill="#ffe135" />
        </svg>
      </div>

      <div className="absolute bottom-40 left-[8%]">
        <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
          <path d="M15 2L18 12H28L20 18L23 28L15 22L7 28L10 18L2 12H12L15 2Z" fill="#ff7b54" opacity="0.6" />
        </svg>
      </div>

      {/* Doodle Lines */}
      <div className="absolute top-[60%] right-[5%]">
        <svg width="100" height="60" viewBox="0 0 100 60" fill="none">
          <path d="M5 30 Q 25 5, 50 30 T 95 30" stroke="#00c8c8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
        </svg>
      </div>

      {/* Small circles */}
      <div className="absolute bottom-32 right-[25%]">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" fill="#00c8c8" />
        </svg>
      </div>

      <div className="absolute top-[40%] left-[5%]">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" fill="#ff7b54" opacity="0.7" />
        </svg>
      </div>

      {/* Keychain illustration */}
      <div className="absolute bottom-48 left-[15%] hidden lg:block">
        <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
          <circle cx="40" cy="15" r="10" stroke="#333" strokeWidth="3" fill="none" />
          <rect x="15" y="30" width="50" height="60" rx="8" fill="white" stroke="#333" strokeWidth="3" />
          <circle cx="40" cy="60" r="15" fill="#00c8c8" opacity="0.3" />
          <path d="M32 55 L40 65 L48 55" stroke="#00c8c8" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Badge illustration */}
      <div className="absolute top-[35%] right-[8%] hidden lg:block">
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
          <circle cx="35" cy="35" r="30" fill="white" stroke="#333" strokeWidth="3" />
          <circle cx="35" cy="35" r="22" fill="#ffe135" opacity="0.5" />
          <path d="M35 20 L38 30 L48 30 L40 36 L43 46 L35 40 L27 46 L30 36 L22 30 L32 30 Z" fill="#ff7b54" />
        </svg>
      </div>
    </div>
  )
}

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dotted pattern */}
      <div className="absolute top-0 left-0 w-full h-full" style={{ 
        backgroundImage: 'radial-gradient(circle, rgba(0,200,200,0.15) 2px, transparent 2px)',
        backgroundSize: '40px 40px'
      }} />
    </div>
  )
}

export function DoodleElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Squiggly lines */}
      <div className="absolute top-20 left-[5%]">
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
          <path d="M5 20 Q 20 5, 35 20 T 65 20 T 95 20 T 115 20" stroke="#00c8c8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
        </svg>
      </div>

      <div className="absolute bottom-32 right-[10%]">
        <svg width="80" height="30" viewBox="0 0 80 30" fill="none">
          <path d="M5 15 Q 15 5, 25 15 T 45 15 T 65 15 T 75 15" stroke="#ff7b54" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
        </svg>
      </div>

      {/* Plus signs */}
      <div className="absolute top-40 right-[20%]">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 5 L15 25 M5 15 L25 15" stroke="#ffe135" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute bottom-48 left-[18%]">
        <svg width="20" height="20" viewBox="0 0 30 30" fill="none">
          <path d="M15 5 L15 25 M5 15 L25 15" stroke="#7ed957" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>

      {/* Circles */}
      <div className="absolute top-[30%] left-[3%]">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="15" stroke="#00c8c8" strokeWidth="3" fill="none" opacity="0.3" />
        </svg>
      </div>

      <div className="absolute bottom-20 right-[30%]">
        <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
          <circle cx="12.5" cy="12.5" r="10" fill="#ff7b54" opacity="0.2" />
        </svg>
      </div>
    </div>
  )
}
