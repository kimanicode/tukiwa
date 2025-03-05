import React from 'react'

const Navbar = () => {
  return (
    <div>
      <div className="navbar bg-white text-base-100 shadow-sm">
  <div className="navbar-start">
    <div className="dropdown">
      <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /> </svg>
      </div>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
        <li><a>Item 1</a></li>
        <li>
          <a className=''>Parent</a>
          <ul className="p-2">
            <li><a>Submenu 1</a></li>
            <li><a>Submenu 2</a></li>
          </ul>
        </li>
        <li><a>Item 3</a></li>
      </ul>
    </div>
    <a className="bg-gradient-to-r from-blue-600 to-green-500 inline-block text-transparent bg-clip-text  font-bold text-2xl">Tukiwa</a>
  </div>
  <div className="navbar-center hidden lg:flex">
    <ul className="menu menu-horizontal px-1">
      <li><a>About Tukiwa</a></li>
      <li>
        <details>
          <summary>Fundraisers</summary>
          <ul className="p-2 text-white">
            <li><a>Submenu 1</a></li>
            <li><a>Submenu 2</a></li>
          </ul>
        </details>
      </li>
      <li><a>How It Works</a></li>
    </ul>
  </div>
  <div className="navbar-end md:flex hidden">
    <a className="btn">Sign In</a>
  </div>
</div>
    </div>
  )
}

export default Navbar
