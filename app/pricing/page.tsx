"use client"
import { useState } from "react";

const Pricing = () => {
  const [amount, setAmount] = useState(5000);
  let fee = 0.025;
  let transactionFee = amount * fee;
  let newAmount = amount - transactionFee;

  // Format the number with commas
  const formatWithCommas = (value: number | string): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Format currency for display
  const formatCurrency = (value: number | string): string => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(Number(value)); // Corrected closing parenthesis
  };
  

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/,/g, ""); // Remove commas
    rawValue = rawValue.replace(/\D/g, ""); // Remove non-numeric characters
    setAmount(rawValue ? parseInt(rawValue, 10) : 0);
  };
  

  return (
    <div className='w-full  bg-gradient-to-b from-white to-[#f3f4f6]  md:p-20  p-10'>

      <div className='py-10 '>
        <p className='text-4xl md:text-6xl bg-gradient-to-r from-new-red to-periwinkle inline-block text-transparent bg-clip-text'>
          Create fundraisers for <span>Free</span>
        </p>
      </div>

      <div>
        <div className="card w-full bg-base-100 shadow-sm">
          <div className="card-body">
            <span className="badge badge-xs badge-warning p-2">Default</span>
            <div className="flex justify-between flex-col md:flex-row">
              <h2 className="text-3xl font-bold">Price breakdown</h2>
              <span className="md:text-2xl font-bold text-warning">2.5% Per Donation</span>
            </div>
            <ul className="mt-6 flex flex-col gap-2 text-xs">
              <li>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Flat 2.5% on Every Contribution</span>
              </li>
              <li>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Only pay as you receive funds</span>
              </li>
            </ul>
            <div className="mt-6 flex justify-center">
              <button className="btn bg-periwinkle rounded-full md:w-1/3 w-full" >Start Fundraising</button>
            </div>
          </div>
        </div>
      </div>

      <div className='py-10'>
        <p className='text-4xl md:text-6xl bg-gradient-to-r from-new-red to-periwinkle inline-block text-transparent bg-clip-text'>
          Let's Talk Numbers
        </p>

        <div className='flex justify-center text-base-100 py-10 gap-10 basis-full flex-col md:flex-row'>

          <div className='basis-1/2'>
            <div className="stats shadow w-full">
              <div className="stat place-items-center">
                <div className="stat-title text-secondary md:text-xl">How much do you want to raise?</div>
                <div className="stat-value text-secondary py-4">
                  <input 
                    type="text"   
                    value={`KSH ${formatWithCommas(amount)}`}
                    onChange={handleChange}
                    placeholder="Enter Amount Here" 
                    className="input text-white bg-base-100" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='basis-1/2'>
            <div className="stats shadow w-full">
              <div className="stat place-items-center">
                <div className="stat-title text-secondary md:text-xl">What you receive in your Account</div>
                <div className="stat-value py-2 text-green-400">{formatCurrency(newAmount)}</div>
                <div className="stat-desc text-secondary">↗︎ Transaction Fee: {formatCurrency(transactionFee)}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Pricing;
