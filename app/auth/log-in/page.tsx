"use client";

const Login = () => {
  return (
    <div className="flex justify-center items-center min-h-screen py-5 bg-gradient-to-b from-white to-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-6 flex flex-col items-center min-h-[60vh]">
        <h2 className="text-3xl font-bold text-center text-gray-800">Login</h2>
        <p className="text-sm text-center text-gray-500 mt-2">Sign in to your account</p>

        <form className="mt-4 w-full flex flex-col flex-grow">
          <div className="form-control flex flex-col py-2">
            <label className="label">
              <span className="label-text text-gray-700">Email</span>
            </label>
            <input type="email" placeholder="me@kimani.com" className="input input-bordered w-full" required />
          </div>

          <div className="form-control flex flex-col py-2">
            <label className="label">
              <span className="label-text text-gray-700">Password</span>
            </label>
            <input type="password" placeholder="••••••••" className="input input-bordered w-full" required />
          </div>

          <div className="flex justify-between w-full text-sm text-new-red text-center px-2 mt-1">
            <a href="#" className="hover:underline p">Forgot password?</a>
          </div>

          <div className="form-control mt-7 flex justify-center">
            <button className="btn bg-gradient-to-r from-new-red to-periwinkle border-none hover:bg-black/50 text-white w-full rounded-full md:w-2/3 px-6 py-6">
              Login
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-white py-4">
          Don't have an account? <a className="text-blue-600 hover:underline" href="/auth/sign-up">Sign Up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
