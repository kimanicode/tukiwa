"use client";

import React from "react";
import { motion } from "framer-motion";

const Action: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-white to-gray-200 md:p-20 p-10 flex justify-center">
      {/* Animated Card */}
      <motion.div
        className="bg-gradient-to-r from-new-red to-periwinkle h-[200px] md:w-[70%] w-full rounded-2xl flex flex-col justify-center items-center text-center shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <motion.h2
          className="text-xl md:text-2xl p-3 text-white font-semibold"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          viewport={{ once: true }}
        >
          Ready to get your Fundraiser running on AutoPilot?
        </motion.h2>

        <motion.div
          className="py-4"
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          viewport={{ once: true }}
        >
          <a
            className="btn bg-white text-red-500 hover:bg-gray-100 px-6 py-2 rounded-full shadow-md"
            href="/auth/log-in"
            aria-label="Start a Fundraiser"
          >
            Start a Fundraiser
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Action;
