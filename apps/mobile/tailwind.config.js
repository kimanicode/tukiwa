/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#007A35",
          dark: "#005A27",
          light: "#DFF3E7",
          mid: "#07913F"
        },
        chama: {
          green: "#007A35",
          "green-light": "#DFF3E7",
          "green-mid": "#07913F",
          "green-bright": "#2EBE72",
          teal: "#0F6E56",
          "teal-light": "#E1F5EE",
          "teal-mid": "#1D9E75",
          amber: "#854F0B",
          "amber-light": "#FAEEDA",
          red: "#A32D2D",
          "red-light": "#FCEBEB",
          canvas: "#FAF7ED"
        }
      }
    }
  },
  plugins: []
};
