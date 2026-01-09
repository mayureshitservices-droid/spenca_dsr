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
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
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
