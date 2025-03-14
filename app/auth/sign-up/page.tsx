import React from "react";
import { motion } from "framer-motion";

const Signup = () => {
  return (
    <div className="flex justify-center items-center py-5 min-h-screen bg-gradient-to-b from-white to-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-6 flex flex-col items-center min-h-[60vh]">
        <h2 className="text-3xl font-bold text-center text-gray-800">Sign Up</h2>
        <p className="text-sm text-center text-gray-500 mt-2">Create an account to get started</p>

        <form className="mt-4 w-full">
          <div className="form-control flex flex-col py-2">
            <label className="label">
              <span className="label-text text-gray-700">Full Name</span>
            </label>
            <input type="text" placeholder="Kimani Karaba" className="input input-bordered w-full" required />
          </div>

          <div className="form-control flex flex-col py-2">
            <label className="label">
              <span className="label-text text-gray-700">Email</span>
            </label>
            <input type="email" className="input input-bordered w-full" required placeholder="kimani@gmail.com" />
          </div>

          <div className="form-control flex flex-col py-2">
            <label className="label">
              <span className="label-text text-gray-700">Password</span>
            </label>
            <input type="password" placeholder="••••••••" className="input input-bordered w-full" required />
          </div>

          <div className="form-control flex flex-col py-2">
            <label className="label">
              <span className="label-text text-gray-700">Confirm Password</span>
            </label>
            <input type="password" className="input input-bordered w-full" required />
          </div>

          <div className="form-control mt-4 flex justify-center">
            <button className="btn bg-gradient-to-r from-new-red to-periwinkle border-none hover:bg-black/50 text-white w-full rounded-full md:w-2/3 p-6">
              Create Account
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-500 mt-4">
          Already have an account? <a className="text-blue-600 hover:underline" href="/auth/log-in">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
