"use client";

import { motion } from "framer-motion";
import { HeartHandshake, Bot, MessageSquareShare, ShieldCheck, Wallet2, Clock } from "lucide-react";

const why = [
  {
    id: 222,
    title: "Seamless Fundraising",
    description: "Create, share, and manage fundraisers effortlessly with AI-powered automation.",
    icon: <HeartHandshake size={50} />,
  },
  {
    id: 333,
    title: "AI-Powered Contribution Tracking",
    description: "No more manual tracking—AI updates donation records and reminds pledgers automatically.",
    icon: <Bot size={50} />,
  },
  {
    id: 444,
    title: "WhatsApp & M-Pesa Integration",
    description: "Accept donations directly via M-Pesa and keep your WhatsApp group updated in real-time.",
    icon: <MessageSquareShare size={50} />,
  },
  {
    id: 545,
    title: "Transparent & Secure",
    description: "AI-powered fraud detection ensures legitimacy and accountability for all fundraisers.",
    icon: <ShieldCheck size={50} />,
  },
  {
    id: 54678,
    title: "Instant Payouts",
    description: "Withdraw funds instantly to M-Pesa or bank accounts without delays.",
    icon: <Wallet2 size={50} />,
  },
  {
    id: 1265357,
    title: "Pledge System",
    description: "Donors can pledge to give later or set up recurring donations for long-term support.",
    icon: <Clock size={50} />,
  },
];

const Why = () => {
  return (
    <div className="w-full bg-gradient-to-r from-white to-[#f3f4f6] md:p-20 p-10">
      {/* Animated Heading */}
      <motion.h2
        className="text-4xl md:text-6xl bg-gradient-to-r from-new-red to-periwinkle text-transparent bg-clip-text text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Why Tukiwa
      </motion.h2>

      <div className="flex gap-10 md:flex-row flex-col items-center">
        {/* Animated Phone Mockup */}
        <motion.div
          className="flex justify-center items-center md:w-full md:min-h-screen h-1/2 p-10"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mockup-phone border-new-red">
            <div className="mockup-phone-camera"></div>
            <div className="mockup-phone-display">
              <img alt="wallpaper" src="wall.png" className="md:h-full md:w-full object-cover" />
            </div>
          </div>
        </motion.div>

        {/* Animated Feature Cards */}
        <div className="flex flex-wrap md:flex-row gap-5 md:h-1/2">
          {why.map((reason, index) => (
            <motion.div
              key={reason.id}
              className="card hover:bg-black hover:text-white text-black bg-slate-100 hover:text-primary-content md:basis-[30%] basis-full shadow-2xl"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <div className="card-body">
                <p className="text-new-red">{reason.icon}</p>
                <h2 className="text-xl font-semibold">{reason.title}</h2>
                <p>{reason.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Why;
