module.exports = {
    content: [
        "./views/**/*.ejs",
        "./public/**/*.js"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#f2f4ff',
                    100: '#e1e5ff',
                    200: '#c8ceff',
                    300: '#a3acff',
                    400: '#7a82ff',
                    500: '#4f56fa',
                    600: '#1C2574', // Main Brand Color
                    700: '#161d5c',
                    800: '#13184b',
                    900: '#11153d',
                    950: '#090b21',
                },
                secondary: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                    950: '#030712',
                },
            },
            boxShadow: {
                'around': '0 0 20px -2px rgba(0, 0, 0, 0.2), 0 0 10px -4px rgba(0, 0, 0, 0.1)',
                'around-lg': '0 0 40px -5px rgba(0, 0, 0, 0.3), 0 0 20px -5px rgba(0, 0, 0, 0.15)',
                'around-indigo': '0 0 25px -5px rgba(79, 70, 229, 0.25)',
            }
        }
    }
}
