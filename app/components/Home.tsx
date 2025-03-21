"use client"
import { useRouter } from 'next/navigation'

const Home = () => {
  const router = useRouter()

  return (
    <div>
      <div className="hero bg-gradient-to-r from-white to-[#f3f4f6] min-h-[40vh] md:min-h-screen">
        <div className="hero-content text-center">
          <div className="">
            <h1 className="text-4xl md:text-6xl bg-gradient-to-r from-new-red to-periwinkle inline-block text-transparent bg-clip-text">
              Fundraising Made Simple
            </h1>
            <p className="py-6 text-black md:text-xl text-center">
              Elevate your fundraising experience with our seamless, WhatsApp-integrated platform. <br /> 
              Effortlessly collect, track, and manage contributions for medical bills, community projects, and more.
            </p>
            <button
              className="btn rounded-full bg-black text-white font-light w-[80%] md:w-1/3 border-2 border-white py-6 hover:border-transition duration-300 hover:border-periwinkle p-6"
              onClick={() => router.push("/auth/log-in")}
            >
              Start a Fundraiser
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
