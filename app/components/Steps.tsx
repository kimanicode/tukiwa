"use client";
import React from "react";
import { motion } from "framer-motion";

const Steps = () => {
  return (
    <div className="w-full  bg-gradient-to-r from-white to-[#f3f4f6]">
      {/* Title */}
      <motion.p
        className="text-4xl md:text-6xl bg-gradient-to-r from-new-red to-periwinkle text-transparent bg-clip-text text-center md:py-6 py-4"
        initial={{ opacity: 0, y: -50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false }}
      >
        Simple Steps
      </motion.p>

      <div className="hero  bg-gradient-to-r from-white to-[#f3f4f6] min-h-screen">
        <div className="hero-content flex-col lg:flex-row-reverse gap-10 justify-between">
          
          {/* Animated Image (Triggers on Scroll) */}
          <motion.img
            src="donation.png"
            className="md:max-w-sm w-full bg-red rounded-full shadow-2xl"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            viewport={{ once: false }}
          />

          {/* Steps Animation */}
          <div className="flex justify-center">
            <ul className="steps steps-vertical text-base-100">
              {[
                "Create Your Fundraiser",
                "Share Your Fundraiser",
                "Receive Donations Instantly",
                "Meet Your Goal & Celebrate",
              ].map((step, index) => (
                <motion.li
                  key={index}
                  className={`step ${
                    index === 0
                      ? "step-primary"
                      : index === 1
                      ? "step-secondary"
                      : index === 2
                      ? "step-success"
                      : "step-warning"
                  }`}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.3 }}
                  viewport={{ once: false }}
                >
                  {step}
                </motion.li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Steps;
