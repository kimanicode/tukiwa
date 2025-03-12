"use client";
import { useRouter } from "next/navigation";

const Home = () => {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-white to-[#f3f4f6]">
      <div className="flex flex-grow items-center justify-center text-center">
        <div>
          <h1 className="text-4xl md:text-6xl bg-gradient-to-r from-new-red to-periwinkle inline-block text-transparent bg-clip-text">
            Fundraising Made Simple
          </h1>
          <p className="py-6 text-base-100 md:text-xl">
            Let your Fundraiser run on <span className="">Autopilot</span>
          </p>
          <button
            className="btn rounded-full bg-base-200 text-white font-light md:w-1/3 border-2 border-white py-5 hover:border-transition duration-300 hover:border-periwinkle"
            onClick={() => router.push("/auth/log-in")}
          >
            Start a Fundraiser
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
