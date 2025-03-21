"use client"
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const router= useRouter();
  return (
    <div className=''>
      <div className="navbar md:px-20 bg-gradient-to-r from-white to-[#f3f4f6] text-base-100 shadow-sm">
  <div className="navbar-start">
    <div className="dropdown">
      <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /> </svg>
      </div>
      { isOpen && <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow text-white">
        <li onClick={() => setIsOpen(!isOpen)}><Link href='/how'>How It Works</Link></li>
        <li>
          <a className=''>Fundraisers</a>
          <ul className="p-2">
                      <li>
                        <Link href="/fundraisers/medical">Medical</Link>
                      </li>
                      <li>
                        <Link href="/fundraisers/community">Community</Link>
                      </li>
                    </ul>
        </li>
        <li><Link href='/pricing'>Pricing</Link></li>
      </ul>}
    </div>

    
    <Link href= '/' className="bg-gradient-to-r from-new-red to-periwinkle inline-block text-transparent bg-clip-text  font-bold text-2xl">Tukiwa</Link>
  </div>
  <div className="navbar-center hidden lg:flex text-black">
    <ul className="menu menu-horizontal px-1 ">
      <li><Link href='/how' className='hover:text-new-red'>How It Works</Link></li>
      <li>
        <details>
          <summary className='hover:text-new-red'>Fundraisers</summary>
          <ul className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-2 text-black z-10">
                  <li className="p-2 hover:bg-gray-100 rounded">
                    <Link href="/fundraisers/medical">Medical</Link>
                  </li>
                  <li className="p-2 hover:bg-gray-100 rounded">
                    <Link href="/fundraisers/community">Community</Link>
                  </li>
                </ul>
        </details>
      </li>
      <li><Link  href='/pricing' className='hover:text-new-red'>Pricing</Link></li>
    </ul>
  </div>
  <div className="navbar-end md:flex hidden">
    <button className="btn bg-black"  onClick={() => router.push("/auth/sign-up")}>Sign In </button>
  </div>
</div>
    </div>
  )
}

export default Navbar
