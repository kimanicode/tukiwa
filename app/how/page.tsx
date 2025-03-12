"use client";

import { motion } from "framer-motion";
import { FaRegHandshake, FaWallet, FaChartLine } from "react-icons/fa";

const steps = [
  {
    title: "Create a Fundraiser",
    description: "Set up your fundraiser in minutes. Customize your campaign, set a goal, and share your story.",
    icon: <FaRegHandshake className="text-4xl text-new-red" />,
  },
  {
    title: "Receive Contributions",
    description: "Share your fundraiser link via WhatsApp and social media. Receive real-time contributions securely.",
    icon: <FaWallet className="text-4xl text-new-red" />,
  },
  {
    title: "Track & Withdraw Funds",
    description: "Monitor donations with live tracking and withdraw funds instantly to your bank or mobile wallet.",
    icon: <FaChartLine className="text-4xl text-new-red" />,
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 px-6 py-12 flex flex-col items-center">
      <motion.h1 
        className="text-4xl font-bold text-gray-800 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        How It Works
      </motion.h1>

      <p className="text-gray-500 text-lg text-center mt-2 max-w-2xl">
        Raise funds easily with our simple and transparent process. Follow these steps to start your journey.
      </p>

      <div className="mt-10 grid md:grid-cols-3 gap-8 max-w-4xl">
        {steps.map((step, index) => (
          <motion.div 
            key={index} 
            className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            viewport={{ once: true }}
          >
            <div className="mb-4">{step.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800">{step.title}</h3>
            <p className="text-gray-600 mt-2">{step.description}</p>
          </motion.div>
        ))}
      </div>

      <motion.a 
        href="/auth/sign-up"
        className="mt-10 px-6 py-3 bg-gradient-to-r from-new-red to-periwinkle text-white rounded-full text-lg shadow-md hover:opacity-90 transition md:w-1/4 text-center"
        whileHover={{ scale: 1.05 }}
      >
        Get Started
      </motion.a>
    </div>
  );
};

export default HowItWorks;
