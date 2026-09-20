/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			// Self-hosted variable fonts (@fontsource-variable), imported in main.tsx.
  			sans: ['"Manrope Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			display: ['"Fraunces Variable"', 'Georgia', 'serif']
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			// Festive palette (see index.css :root).
  			pine: {
  				950: 'hsl(var(--pine-950))',
  				900: 'hsl(var(--pine-900))',
  				800: 'hsl(var(--pine-800))',
  				700: 'hsl(var(--pine-700))'
  			},
  			gold: 'hsl(var(--gold))',
  			cream: {
  				DEFAULT: 'hsl(var(--cream))',
  				muted: 'hsl(var(--cream-muted))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			// Elevated white card on the dark background.
  			elevated: '0 24px 60px -24px rgb(0 0 0 / 0.6), 0 2px 8px -2px rgb(0 0 0 / 0.3)',
  			// Primary call-to-action glow.
  			glow: '0 10px 30px -8px hsl(var(--primary) / 0.7), 0 0 0 1px hsl(var(--primary) / 0.25)',
  			// Warm gold halo around a highlighted photo.
  			halo: '0 0 0 4px hsl(var(--gold) / 0.35), 0 24px 60px -16px hsl(var(--gold) / 0.45)'
  		},
  		keyframes: {
  			float: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-8px)' }
  			},
  			'fade-up': {
  				from: { opacity: '0', transform: 'translateY(12px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			twinkle: {
  				'0%, 100%': { opacity: '0.55' },
  				'50%': { opacity: '1' }
  			},
  			// Final-page portrait: blurred and small, then snaps into focus.
  			reveal: {
  				from: { opacity: '0', transform: 'scale(0.7)', filter: 'blur(16px)' },
  				to: { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' }
  			}
  		},
  		animation: {
  			float: 'float 7s ease-in-out infinite',
  			'fade-up': 'fade-up 0.6s ease-out both',
  			twinkle: 'twinkle 3.5s ease-in-out infinite',
  			reveal: 'reveal 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
